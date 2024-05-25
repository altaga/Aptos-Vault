import React, {Component, Fragment} from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Linking,
} from 'react-native';
import Renders from '../../assets/logo.png';
import Title from '../../assets/title.png';
import GlobalStyles, {
  footer,
  header,
  main,
  mainColor,
  secondaryColor,
} from '../../styles/styles';
import ContextModule from '../../utils/contextModule';
import {
  BatchTokenBalancesAddress,
  CloudPublicKeyEncryption,
  blockchain,
  network,
} from '../../utils/constants';
import {
  deleteLeadingZeros,
  epsilonRound,
  findIndexByProperty,
  formatInputText,
  getAsyncStorageValue,
} from '../../utils/utils';
import VirtualKeyboard from 'react-native-virtual-keyboard';
import ReadCard from './components/readCard';
import Crypto from 'react-native-quick-crypto';
import {ethers} from 'ethers';
import {abiBatchTokenBalances} from '../../contracts/batchTokenBalances';
import {abiAAContract} from '../../contracts/aaContract';
import checkMark from '../../assets/checkMark.png';
import RNPrint from 'react-native-print';
import {logo} from '../../assets/logo';
import QRCode from 'react-native-qrcode-svg';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import {GOOGLE_URL_API} from '@env';
import {Aptos} from '@aptos-labs/ts-sdk';

function setTokens(array) {
  return array.map((item, index) => {
    return {
      ...item,
      value: index,
      label: item.name,
      key: item.symbol,
    };
  });
}

const BaseStatePaymentWallet = {
  // Base
  publicKeyCard:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  tokenSelected: [setTokens(blockchain.tokens)[0]], //
  balances: blockchain.tokens.map(() => 0),
  usdConversion: blockchain.tokens.map(() => 1),
  activeTokens: blockchain.tokens.map(() => false), // to do later
  stage: 0, // 0
  amount: '0.00', // "0.00"
  cardInfo: null,
  loading: true,
  status: 'Processing...',
  explorerURL: '',
  transactionDisplay: {
    name: 'APT',
    amount: 0,
  },
  // QR print
  saveData: '',
};

class PaymentWallet extends Component {
  constructor(props) {
    super(props);
    this.state = BaseStatePaymentWallet;
    this.svg = null;
    this.aptos = new Aptos(blockchain.aptosConfig);
  }

  static contextType = ContextModule;

  async getDataURL() {
    return new Promise(async (resolve, reject) => {
      this.svg.toDataURL(async data => {
        this.setState(
          {
            saveData: data,
          },
          () => resolve('ok'),
        );
      });
    });
  }

  async print() {
    await this.getDataURL();
    const results = await RNHTMLtoPDF.convert({
      html: `
        <div style="text-align: center;">
          <img src='${logo}' width="400px"></img>
          <h1 style="font-size: 3rem;">--------- Original Reciept ---------</h1>
          <h1 style="font-size: 3rem;">Date: ${new Date().toLocaleDateString()}</h1>
          <h1 style="font-size: 3rem;">Type: transfer_coins</h1>
          <h1 style="font-size: 3rem;">------------------ • ------------------</h1>
          <h1 style="font-size: 3rem;">Transaction</h1>
          <h1 style="font-size: 3rem;">Amount: ${
            this.state.transactionDisplay.amount
          } ${this.state.transactionDisplay.name}</h1>
          <h1 style="font-size: 3rem;">------------------ • ------------------</h1>
          <img style="width:70%" src='${
            'data:image/png;base64,' + this.state.saveData
          }'></img>
      </div>
      `,
      fileName: 'print',
      base64: true,
    });
    await RNPrint.print({filePath: results.filePath});
  }

  componentDidMount() {
    this.props.navigation.addListener('focus', async () => {
      const usdConversion = await getAsyncStorageValue('usdConversion');
      this.setState({
        usdConversion: usdConversion ?? BaseStatePaymentWallet.usdConversion,
        loading: false,
      });
    });
  }

  encryptCardData(cardData) {
    const encrypted = Crypto.publicEncrypt(
      {
        key: CloudPublicKeyEncryption,
      },
      Buffer.from(cardData, 'utf8'),
    );
    return encrypted.toString('base64');
  }

async getTransaction(address, amountIn, tokenAddress) {
    return {
      function:
        tokenAddress === blockchain.tokens[0].address
          ? '0x1::aptos_account::transfer'
          : '0x1::aptos_account::transfer_coins',
      typeArguments:
        tokenAddress === blockchain.tokens[0].address ? [] : [tokenAddress],
      functionArguments: [address, amountIn.toString()],
    };
  }

  async processPayment() {
    await this.setStateAsync({
      explorerURL: `${blockchain.blockExplorer}account/${this.state.publicKeyCard}?network=${network}#coins`,
      status: 'Confirmed',
      loading: false,
    });
  }

  async payFromCard(token) {
    let index = findIndexByProperty(
      blockchain.tokens,
      'address',
      token.address,
    );
    if (index === -1) {
      throw new Error('Token not found');
    }
    let usdConversion = this.state.usdConversion[index];
    const amountCrypto = epsilonRound(
      parseFloat(deleteLeadingZeros(formatInputText(this.state.amount))) /
        usdConversion,
      blockchain.tokens[index].decimals,
    );
    console.log(amountCrypto);
    console.log(
      ethers.utils.parseUnits(
        amountCrypto.toString(),
        blockchain.tokens[index].decimals,
      ).toBigInt(),
    );
    let transaction = await Promise.all([
      this.getTransaction(
        this.context.value.publicKey,
        ethers.utils.parseUnits(
          amountCrypto.toString(),
          blockchain.tokens[index].decimals,
        ),
        blockchain.tokens[index].address,
      ),
    ]);
    return new Promise(async (resolve, reject) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');
      const raw = JSON.stringify({
        data: this.encryptCardData(
          `${this.state.cardInfo.card}${this.state.cardInfo.exp}`,
        ),
        transaction,
      });
      await this.setStateAsync({
        transactionDisplay: {
          amount: epsilonRound(amountCrypto, 6),
          name: blockchain.tokens[index].symbol,
          tokenAddress: blockchain.tokens[index].address,
          icon: blockchain.tokens[index].icon,
        },
      });
      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };

      fetch(`${GOOGLE_URL_API}/WithdrawCard`, requestOptions)
        .then(response => response.text())
        .then(result => {
          if (result === 'Bad Request') {
            reject('Bad Request');
          } else {
            resolve(result);
          }
        })
        .catch(error => reject(error));
    });
  }

  async getAddressFromCard() {
    return new Promise((resolve, reject) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');

      const raw = JSON.stringify({
        data: this.encryptCardData(
          `${this.state.cardInfo.card}${this.state.cardInfo.exp}`,
        ),
      });

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };

      fetch(`${GOOGLE_URL_API}/GetAddress`, requestOptions)
        .then(response => response.text())
        .then(result => {
          if (result === 'Bad Request') {
            reject();
          } else {
            resolve(result);
          }
        })
        .catch(error => reject(error));
    });
  }

  async getBalances() {
    try {
      const balancesTemp = await Promise.all(
        blockchain.tokens.map(token =>
          this.aptos.getAccountCoinAmount({
            accountAddress: this.state.publicKeyCard,
            coinType: token.address,
          }),
        ),
      );
      const balances = blockchain.tokens.map((token, index) =>
        ethers.utils.formatUnits(balancesTemp[index], token.decimals),
      );
      const activeTokens = balances.map(
        (tokenBalance, index) =>
          tokenBalance >=
          parseFloat(deleteLeadingZeros(formatInputText(this.state.amount))) /
            this.state.usdConversion[index],
      );
      await this.setStateAsync({balances, activeTokens, stage: 2});
    } catch (error) {
      console.log(error);
    }
  }

  // Utils
  async setStateAsync(value) {
    return new Promise(resolve => {
      this.setState(
        {
          ...value,
        },
        () => resolve(),
      );
    });
  }

  render() {
    return (
      <Fragment>
        <SafeAreaView style={[GlobalStyles.container]}>
          <View
            style={[
              GlobalStyles.headerMain,
              {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignContent: 'center',
              },
            ]}>
            <View style={GlobalStyles.headerItem}>
              <Image
                source={Renders}
                alt="Logo"
                style={{
                  width: 192 / 3,
                  height: 192 / 3,
                  alignSelf: 'flex-start',
                  marginLeft: 20,
                }}
              />
            </View>
            <View style={GlobalStyles.headerItem}>
              <Image
                source={Title}
                alt="Logo"
                style={{
                  width: 589 * (header / (120 * 2)),
                  height: 120 * (header / (120 * 2)),
                }}
              />
            </View>
          </View>
          <View
            style={[
              GlobalStyles.mainSend,
              {
                height: main + footer,
                justifyContent: 'space-around',
                alignItems: 'center',
              },
            ]}>
            {this.state.stage === 0 && (
              <View
                style={{
                  flex: Dimensions.get('window').height - 100,
                  justifyContent: 'space-evenly',
                  alignItems: 'center',
                }}>
                <Text style={GlobalStyles.title}>Enter Amount (USD)</Text>
                <Text style={{fontSize: 36, color: 'white'}}>
                  {deleteLeadingZeros(formatInputText(this.state.amount))}
                </Text>
                <VirtualKeyboard
                  style={{
                    width: '80vw',
                    fontSize: 40,
                    textAlign: 'center',
                    marginTop: -10,
                  }}
                  cellStyle={{
                    width: 50,
                    height: 50,
                    borderWidth: 1,
                    borderColor: '#77777777',
                    borderRadius: 5,
                    margin: 1,
                  }}
                  color="white"
                  pressMode="string"
                  onPress={amount => this.setState({amount})}
                  decimal
                />
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-evenly',
                    width: Dimensions.get('window').width,
                  }}>
                  <Pressable
                    style={GlobalStyles.buttonStyle}
                    onPress={() => this.setState({stage: 1})}>
                    <Text style={GlobalStyles.buttonText}>Pay with Card</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {this.state.stage === 1 && (
              <React.Fragment>
                <View
                  style={{
                    justifyContent: 'space-evenly',
                    alignItems: 'center',
                  }}>
                  <Text style={GlobalStyles.title}>Amount (USD)</Text>
                  <Text style={{fontSize: 36, color: 'white'}}>
                    $ {deleteLeadingZeros(formatInputText(this.state.amount))}
                  </Text>
                </View>
                <ReadCard
                  cardInfo={async cardInfo => {
                    if (cardInfo) {
                      await this.setStateAsync({cardInfo});
                      try {
                        const publicKeyCard = await this.getAddressFromCard();
                        await this.setStateAsync({publicKeyCard});
                        await this.getBalances();
                      } catch (error) {
                        this.setState({stage: 0});
                      }
                    }
                  }}
                />
              </React.Fragment>
            )}
            {this.state.stage === 2 && (
              <React.Fragment>
                <Text style={[GlobalStyles.title, {marginVertical: 50}]}>
                  Select Payment Token
                </Text>
                <ScrollView>
                  {blockchain.tokens
                    .filter((_, index) => this.state.activeTokens[index])
                    .map((token, index, array) => (
                      <View
                        key={index}
                        style={{
                          paddingBottom: array.length === index + 1 ? 0 : 20,
                          marginBottom: 20,
                          borderBottomWidth: array.length === index + 1 ? 0 : 1,
                          borderColor: mainColor,
                        }}>
                        <Pressable
                          disabled={this.state.loading}
                          style={[
                            GlobalStyles.buttonStyle,
                            this.state.loading ? {opacity: 0.5} : {},
                          ]}
                          onPress={async () => {
                            try {
                              await this.setStateAsync({
                                status: 'Processing...',
                                stage: 3,
                                explorerURL: '',
                                loading: true,
                              });
                              await this.payFromCard(token);
                              this.processPayment();
                            } catch (error) {
                              console.log(error);
                            }
                            await this.setStateAsync({loading: false});
                          }}>
                          <Text style={GlobalStyles.buttonText}>
                            Pay with {token.symbol}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                </ScrollView>
              </React.Fragment>
            )}
            {
              // Stage 3
              this.state.stage === 3 && (
                <React.Fragment>
                  <Image
                    source={checkMark}
                    alt="check"
                    style={{width: 200, height: 200}}
                  />
                  <Text
                    style={{
                      textShadowRadius: 1,
                      fontSize: 28,
                      fontWeight: 'bold',
                      color:
                        this.state.status === 'Confirmed'
                          ? mainColor
                          : secondaryColor,
                    }}>
                    {this.state.status}
                  </Text>
                  <View
                    style={[
                      GlobalStyles.networkShow,
                      {
                        width: Dimensions.get('screen').width * 0.9,
                      },
                    ]}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                      }}>
                      <View style={{marginHorizontal: 20}}>
                        <Text style={{fontSize: 20, color: 'white'}}>
                          Transaction
                        </Text>
                        <Text style={{fontSize: 14, color: 'white'}}>
                          transfer_coins
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        marginHorizontal: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <View style={{marginHorizontal: 10}}>
                        {this.state.transactionDisplay.icon}
                      </View>
                      <Text style={{color: 'white'}}>
                        {`${this.state.transactionDisplay.amount}`}{' '}
                        {this.state.transactionDisplay.name}
                      </Text>
                    </View>
                  </View>
                  <View>
                    <Pressable
                      disabled={this.state.explorerURL === ''}
                      style={[
                        GlobalStyles.buttonStyle,
                        this.state.explorerURL === '' ? {opacity: 0.5} : {},
                      ]}
                      onPress={() => Linking.openURL(this.state.explorerURL)}>
                      <Text
                        style={{
                          fontSize: 24,
                          fontWeight: 'bold',
                          color: 'white',
                          textAlign: 'center',
                        }}>
                        View on Explorer
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        GlobalStyles.buttonStyle,
                        {
                          backgroundColor: '#cf69ff',
                        },
                        this.state.explorerURL === '' ? {opacity: 0.5} : {},
                      ]}
                      onPress={async () => {
                        this.print();
                      }}
                      disabled={this.state.explorerURL === ''}>
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 24,
                          fontWeight: 'bold',
                        }}>
                        Print Reciept
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        GlobalStyles.buttonStyle,
                        {
                          backgroundColor: '#6978ff',
                        },
                        this.state.explorerURL === '' ? {opacity: 0.5} : {},
                      ]}
                      onPress={async () => {
                        this.setState({
                          stage: 0,
                          explorerURL: '',
                          check: 'Check',
                          status: 'Processing...',
                          errorText: '',
                          amount: '0.00', // "0.00"
                        });
                      }}
                      disabled={this.state.explorerURL === ''}>
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 24,
                          fontWeight: 'bold',
                        }}>
                        Done
                      </Text>
                    </Pressable>
                  </View>
                </React.Fragment>
              )
            }
          </View>
        </SafeAreaView>
        <View style={{position: 'absolute', bottom: -1000}}>
          <QRCode
            value={
              this.state.explorerURL === ''
                ? 'placeholder'
                : this.state.explorerURL
            }
            size={Dimensions.get('window').width * 0.6}
            ecl="L"
            getRef={c => (this.svg = c)}
          />
        </View>
      </Fragment>
    );
  }
}

export default PaymentWallet;
