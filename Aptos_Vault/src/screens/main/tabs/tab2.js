import {Account, Aptos, Ed25519PrivateKey} from '@aptos-labs/ts-sdk';
import {GOOGLE_URL_API} from '@env';
import Slider from '@react-native-community/slider';
import {ethers} from 'ethers';
import React, {Component, Fragment} from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import Crypto from 'react-native-quick-crypto';
import checkMark from '../../../assets/checkMark.png';
import GlobalStyles, {mainColor} from '../../../styles/styles';
import {
  CloudPublicKeyEncryption,
  blockchain,
  network,
} from '../../../utils/constants';
import ContextModule from '../../../utils/contextModule';
import {
  arraySum,
  epsilonRound,
  formatDate,
  getAsyncStorageValue,
  getEncryptedStorageValue,
  setAsyncStorageValue,
} from '../../../utils/utils';
import CryptoSign from '../components/cryptoSign';

const periodsAvailable = [
  {
    label: 'Daily',
    value: 0,
    periodValue: 86400,
  },
  {
    label: 'Weekly',
    value: 1,
    periodValue: 604800,
  },
  {
    label: 'Monthly',
    value: 2,
    periodValue: 2629800,
  },
  {
    label: 'Yearly',
    value: 3,
    periodValue: 31557600,
  },
];

const protocolsAvailable = [
  {
    label: 'Balanced',
    value: 0,
  },
  {
    label: 'Percentage',
    value: 1,
  },
];

const BasePublicKey =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

const baseTab2State = {
  refreshing: false,
  loading: true,
  savingsFlag: false,
  status: 'Processing...',
  stage: 0,
  savingsDate: 0,
  percentage: 0,
  balancesSavings: blockchain.tokens.map(() => 0),
  usdConversion: blockchain.tokens.map(() => 1),
  activeTokens: blockchain.tokens.map(() => true), // to do later
  periodSelected: 0,
  protocolSelected: 0,
  modal: false,
  transactionBatch: {},
  transactionDisplay: {
    name: 'APT',
    amount: 0,
    gas: 0,
  },
};

export default class Tab2 extends Component {
  constructor(props) {
    super(props);
    this.state = baseTab2State;
    this.aptos = new Aptos(blockchain.aptosConfig);
  }

  static contextType = ContextModule;

  async onceRefresh() {
    const savingsDate = Date.now() + periodsAvailable[0].periodValue * 1000;
    await setAsyncStorageValue({savingsDate});
    await setAsyncStorageValue({periodSelected: 0});
    await setAsyncStorageValue({protocolSelected: 0});
    await this.refresh();
    await this.setStateAsync({
      ...baseTab2State,
    });
  }

  async getSavingsDate() {
    try {
      const savingsDate = await getAsyncStorageValue('savingsDate');
      if (savingsDate === null) throw 'Set First Date';
      return savingsDate;
    } catch (err) {
      await setAsyncStorageValue({savingsDate: 0});
      return 0;
    }
  }

  async getLastRefreshSavings() {
    try {
      const lastRefreshSavings = await getAsyncStorageValue(
        'lastRefreshSavings',
      );
      if (lastRefreshSavings === null) throw 'Set First Date';
      return lastRefreshSavings;
    } catch (err) {
      await setAsyncStorageValue({lastRefreshSavings: 0});
      return 0;
    }
  }

  async componentDidMount() {
    const savingsDate = await this.getSavingsDate();
    const usdConversion = await getAsyncStorageValue('usdConversion');
    const periodSelected = await getAsyncStorageValue('periodSelected');
    const protocolSelected = await getAsyncStorageValue('protocolSelected');
    const percentage = await getAsyncStorageValue('percentage');
    const savingsFlag = await getAsyncStorageValue('savingsFlag');
    const balancesSavings = await getAsyncStorageValue('balancesSavings');
    await this.setStateAsync({
      balancesSavings: balancesSavings ?? baseTab2State.balancesSavings,
      savingsFlag: savingsFlag ?? baseTab2State.savingsFlag,
      savingsDate: savingsDate ?? baseTab2State.savingsDate,
      percentage: percentage ?? baseTab2State.percentage,
      periodSelected: periodSelected ?? baseTab2State.periodSelected,
      protocolSelected: protocolSelected ?? baseTab2State.protocolSelected,
      usdConversion: usdConversion ?? baseTab2State.usdConversion,
      loading: false,
    });
    if (this.context.value.publicKeySavings !== BasePublicKey) {
      const refreshCheck = Date.now();
      const lastRefresh = await this.getLastRefreshSavings();
      if (refreshCheck - lastRefresh >= 1000 * 60 * 2.5) {
        // 2.5 minutes
        console.log('Refreshing...');
        await setAsyncStorageValue({lastRefreshSavings: Date.now()});
        this.refresh();
      } else {
        console.log(
          `Next refresh Available: ${Math.round(
            (1000 * 60 * 2.5 - (refreshCheck - lastRefresh)) / 1000,
          )} Seconds`,
        );
      }
    }
  }

  async setupCloudSavings() {
    const privateKey = await getEncryptedStorageValue('privateKey');
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage('Account Signature');
    return new Promise((resolve, reject) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');
      const raw = JSON.stringify({
        data: this.encryptSignatureData(`${signature}`),
        pubKey: this.context.value.publicKey,
      });
      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };

      fetch(`${GOOGLE_URL_API}/AddSavings`, requestOptions)
        .then(response => response.text())
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  }

  async setupAccount() {
    await this.setStateAsync({loading: true});
    try {
      const publicKeySavings = await this.setupCloudSavings();
      await setAsyncStorageValue({
        publicKeySavings,
      });
      this.context.setValue({publicKeySavings}, async () => {
        await this.onceRefresh();
        await this.setStateAsync({loading: false});
      });
    } catch (err) {
      console.log(err);
      await this.setStateAsync({loading: false});
    }
  }

  // Utils

  async sendTransaction() {
    const privateKey = await getEncryptedStorageValue('privateKey');
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage('Account Signature');
    console.log(signature);
    return new Promise((resolve, reject) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');
      const raw = JSON.stringify({
        data: this.encryptSignatureData(`${signature}`),
        transaction: this.state.transactionBatch,
      });

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };

      fetch(`${GOOGLE_URL_API}/WithdrawSavings`, requestOptions)
        .then(response => response.text())
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  }

  async sign() {
    this.setState({
      status: 'Processing...',
      stage: 2,
      explorerURL: '',
    });
    try {
      const res = await this.sendTransaction();
      if (res === 'Ok') {
        const savingsDate = Date.now() + periodsAvailable[0].periodValue * 1000;
        await setAsyncStorageValue({savingsDate});
        this.setState({
          explorerURL: `${blockchain.blockExplorer}account/${this.context.value.publicKeySavings}?network=${network}`,
          status: 'Confirmed',
        });
      } else {
        throw res;
      }
    } catch (e) {
      console.log(e);
      this.setState({
        stage: 0,
        explorerURL: '',
        transactionBatch: {},
        check: 'Check',
        loading: false,
        modal: false,
        status: 'Processing...',
        errorText: '',
      });
    }
  }

async getTransaction(address, amountIn, tokenAddress) {
    return {
      function:
        tokenAddress === blockchain.tokens[0].address
          ? '0x1::aptos_account::transfer'
          : '0x1::aptos_account::transfer_coins',
      typeArguments:
        tokenAddress === blockchain.tokens[0].address ? [] : [tokenAddress],
      functionArguments: [address, parseInt(amountIn.toString())],
    };
  }

  async batchWithdraw() {
    try {
      const balance = await this.aptos.getAccountCoinAmount({
        accountAddress: this.context.value.publicKeySavings,
        coinType: blockchain.tokens[0].address,
      });
      let transactions = await Promise.all([
        this.getTransaction(
          this.context.value.publicKey,
          ethers.utils.parseUnits('0', blockchain.tokens[0].decimals),
          blockchain.tokens[0].address,
        ),
      ]);

      const individualTransactions = await Promise.all(
        transactions.map(data =>
          this.aptos.transaction.build.simple({
            sender: this.context.value.publicKey,
            data,
          }),
        ),
      );
      const privateKeyTemp = await getEncryptedStorageValue('privateKey');
      const privateKey = new Ed25519PrivateKey(privateKeyTemp);
      const account = Account.fromPrivateKey({privateKey});
      const simulations = await Promise.all(
        individualTransactions.map(transaction =>
          this.aptos.transaction.simulate.simple({
            signerPublicKey: account.publicKey,
            transaction,
          }),
        ),
      );
      const gas = simulations.reduce((sum, current) => {
        const gasUnitPrice = parseInt(current[0].gas_unit_price, 10);
        const gasUsed = parseInt(current[0].gas_used, 10);
        return sum + gasUnitPrice * gasUsed;
      }, 0);
      const check = balance > gas * 2;
      if (!check) {
        throw 'Not enough balance';
      }
      transactions = await Promise.all([
        this.getTransaction(
          this.context.value.publicKey,
          new ethers.BigNumber.from(balance - gas * 2),
          blockchain.tokens[0].address,
        ),
      ]);
      console.log(gas);
      const displayGas = parseFloat(
        ethers.utils.formatUnits(gas * 2, blockchain.tokens[0].decimals),
      );
      const displayAmount = parseFloat(
        ethers.utils.formatUnits(
          balance - gas * 2,
          blockchain.tokens[0].decimals,
        ),
      );
      const transactionDisplay = {
        name: blockchain.tokens[0].symbol,
        amount: epsilonRound(displayAmount, 8),
        gas: epsilonRound(displayGas, 8),
      };
      this.setState({
        transactionDisplay,
        transactionBatch: transactions,
        loading: false,
        modal: check,
      });
    } catch (e) {
      console.log(e);
      console.log('Bad Quote');
    }
  }

  async refresh() {
    await this.setStateAsync({refreshing: true});
    await this.getSavingsBalance();
    await this.setStateAsync({refreshing: false});
  }

  async getSavingsBalance() {
    const balancesTemp = await Promise.all(
      blockchain.tokens.map(token =>
        this.aptos.getAccountCoinAmount({
          accountAddress: this.context.value.publicKeySavings,
          coinType: token.address,
        }),
      ),
    );
    const balancesSavings = blockchain.tokens.map((token, index) =>
      ethers.utils.formatUnits(balancesTemp[index], token.decimals),
    );
    await setAsyncStorageValue({balancesSavings});
    await this.setStateAsync({balancesSavings});
  }

  async changePeriod() {
    const savingsDate =
      Date.now() +
      periodsAvailable[this.state.periodSelected].periodValue * 1000;
    await setAsyncStorageValue({savingsDate});
    await this.setStateAsync({savingsDate});
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

  encryptSignatureData(signatureData) {
    const encrypted = Crypto.publicEncrypt(
      {
        key: CloudPublicKeyEncryption,
      },
      Buffer.from(signatureData, 'utf8'),
    );
    return encrypted.toString('base64');
  }

  render() {
    const modalScale = 0.5;
    return (
      <Fragment>
        <Modal
          visible={this.state.modal}
          transparent={true}
          animationType="slide">
          <View
            style={{
              alignSelf: 'center',
              backgroundColor: '#1E2423',
              width: Dimensions.get('window').width * 0.94,
              height: Dimensions.get('window').height * modalScale,
              marginTop: Dimensions.get('window').height * (0.99 - modalScale),
              borderWidth: 2,
              borderColor: mainColor,
              padding: 20,
              borderRadius: 25,
              justifyContent: 'space-around',
              alignItems: 'center',
            }}>
            <Text
              style={{
                textAlign: 'center',
                color: 'white',
                fontSize: 30,
                width: '80%',
              }}>
              Transaction
            </Text>
            <View
              style={{
                backgroundColor: mainColor,
                height: 1,
                width: '90%',
                marginVertical: 10,
              }}
            />
            <Text
              style={{
                textAlign: 'center',
                color: 'white',
                fontSize: 26,
                width: '100%',
              }}>
              transfer_coins
            </Text>
            <View
              style={{
                backgroundColor: mainColor,
                height: 1,
                width: '90%',
                marginVertical: 10,
              }}
            />
            <Text
              style={{
                textAlign: 'center',
                color: 'white',
                fontSize: 20,
                width: '100%',
              }}>
              Amount:
            </Text>
            <Text
              style={{
                textAlign: 'center',
                color: 'white',
                fontSize: 24,
                width: '100%',
              }}>
              {`${epsilonRound(this.state.transactionDisplay.amount, 8)}`}{' '}
              {this.state.transactionDisplay.name}
              {' ( $'}
              {epsilonRound(
                this.state.transactionDisplay.amount *
                  this.state.usdConversion[0],
                2,
              )}
              {' )'}
            </Text>
            <View
              style={{
                backgroundColor: mainColor,
                height: 1,
                width: '90%',
                marginVertical: 10,
              }}
            />
            <Text
              style={{
                textAlign: 'center',
                color: 'white',
                fontSize: 20,
                width: '100%',
              }}>
              Gas:
            </Text>
            <Text
              style={{
                textAlign: 'center',
                color: 'white',
                fontSize: 24,
                width: '100%',
              }}>
              {this.state.transactionDisplay.gas} {blockchain.token}
              {' ( $'}
              {epsilonRound(
                this.state.transactionDisplay.gas * this.state.usdConversion[0],
                2,
              )}
              {' )'}
            </Text>
            <View
              style={{
                backgroundColor: mainColor,
                height: 1,
                width: '90%',
                marginVertical: 10,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                width: '100%',
              }}>
              <Pressable
                style={[
                  GlobalStyles.singleModalButton,
                  {
                    width: '45%',
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    borderRightColor: 'black',
                    borderRightWidth: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
                onPress={async () => {
                  await this.setStateAsync({
                    modal: false,
                  });
                  this.setState({
                    stage: 1,
                  });
                }}>
                <Text style={[GlobalStyles.singleModalButtonText]}>Accept</Text>
              </Pressable>
              <Pressable
                style={[
                  GlobalStyles.singleModalButton,
                  {
                    width: '45%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                  },
                ]}
                onPress={() => this.setState({modal: false})}>
                <Text style={[GlobalStyles.singleModalButtonText]}>Reject</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <View
          style={{
            width: Dimensions.get('window').width,
          }}>
          <View
            style={{
              justifyContent: 'space-evenly',
              alignItems: 'center',
              height: '100%',
            }}>
            <ScrollView
              style={GlobalStyles.tab2Container}
              contentContainerStyle={[
                GlobalStyles.tab2ScrollContainer,
                {
                  height:
                    this.context.value.publicKeySavings !== BasePublicKey
                      ? 'auto'
                      : '100%',
                },
              ]}>
              {this.context.value.publicKeySavings !== BasePublicKey ? (
                <Fragment>
                  {
                    // Stage 0
                    this.state.stage === 0 && (
                      <Fragment>
                        <View
                          style={{
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderBottomWidth: 2,
                            paddingVertical: 20,
                            borderColor: mainColor,
                            width: '90%',
                          }}>
                          <Text style={[GlobalStyles.titleSaves]}>
                            Savings Account Balance{' '}
                          </Text>
                          <Text
                            style={{
                              fontSize: 38,
                              color: 'white',
                              marginTop: 10,
                            }}>
                            {`$ ${epsilonRound(
                              arraySum(
                                this.state.balancesSavings.map(
                                  (x, i) => x * this.state.usdConversion[i],
                                ),
                              ),
                              2,
                            )} USD`}
                          </Text>
                        </View>
                        <View
                          style={{
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            width: '90%',
                          }}>
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignContent: 'center',
                              width: '100%',
                              borderBottomWidth: 2,
                              marginTop: 20,
                              paddingBottom: 20,
                              borderColor: mainColor,
                            }}>
                            <Text style={[GlobalStyles.titleSaves]}>
                              Activate Savings
                            </Text>
                            <Switch
                              style={{
                                transform: [{scaleX: 1.3}, {scaleY: 1.3}],
                              }}
                              trackColor={{
                                false: '#3e3e3e',
                                true: mainColor + '77',
                              }}
                              thumbColor={
                                this.state.savingsFlag ? mainColor : '#f4f3f4'
                              }
                              ios_backgroundColor="#3e3e3e"
                              onValueChange={async () => {
                                await setAsyncStorageValue({
                                  savingsFlag: !this.state.savingsFlag,
                                });
                                await this.setStateAsync({
                                  savingsFlag: !this.state.savingsFlag,
                                });
                              }}
                              value={this.state.savingsFlag}
                            />
                          </View>
                          {this.state.savingsFlag && (
                            <React.Fragment>
                              <View
                                style={{
                                  borderBottomWidth: 2,
                                  paddingBottom: 20,
                                  borderColor: mainColor,
                                }}>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                  }}>
                                  <Text style={[GlobalStyles.titleSaves]}>
                                    Savings Period
                                  </Text>
                                  <RNPickerSelect
                                    style={{
                                      inputAndroidContainer: {
                                        textAlign: 'center',
                                      },
                                      inputAndroid: {
                                        textAlign: 'center',
                                        color: 'gray',
                                      },
                                      viewContainer: {
                                        ...GlobalStyles.input,
                                        width: '55%',
                                      },
                                    }}
                                    value={this.state.periodSelected}
                                    items={periodsAvailable}
                                    onValueChange={async value => {
                                      await setAsyncStorageValue({
                                        periodSelected: value,
                                      });
                                      await this.setStateAsync({
                                        periodSelected: value,
                                      });
                                    }}
                                  />
                                </View>
                                <Pressable
                                  disabled={this.state.loading}
                                  style={[
                                    GlobalStyles.buttonStyle,
                                    this.state.loading ? {opacity: 0.5} : {},
                                  ]}
                                  onPress={async () => {
                                    await this.setStateAsync({loading: true});
                                    await this.changePeriod();
                                    await this.setStateAsync({loading: false});
                                  }}>
                                  <Text
                                    style={{
                                      color: 'white',
                                      fontSize: 18,
                                      fontWeight: 'bold',
                                    }}>
                                    {this.state.loading
                                      ? 'Changing...'
                                      : 'Change Savings Period'}
                                  </Text>
                                </Pressable>
                              </View>
                              <View
                                style={
                                  ({
                                    width: '100%',
                                  },
                                  this.state.protocolSelected !== 1 && {
                                    borderBottomWidth: 2,
                                    borderColor: mainColor,
                                  })
                                }>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                  }}>
                                  <Text style={[GlobalStyles.titleSaves]}>
                                    Savings Protocol
                                  </Text>
                                  <RNPickerSelect
                                    style={{
                                      inputAndroidContainer: {
                                        textAlign: 'center',
                                      },
                                      inputAndroid: {
                                        textAlign: 'center',
                                        color: 'gray',
                                      },
                                      viewContainer: {
                                        ...GlobalStyles.input,
                                        width:
                                          Dimensions.get('screen').width * 0.5,
                                      },
                                    }}
                                    value={this.state.protocolSelected}
                                    items={protocolsAvailable}
                                    onValueChange={async protocolSelected => {
                                      await setAsyncStorageValue({
                                        protocolSelected,
                                      });
                                      await this.setStateAsync({
                                        protocolSelected,
                                      });
                                    }}
                                  />
                                </View>
                              </View>
                              {this.state.protocolSelected === 1 ? (
                                <View
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignContent: 'center',
                                    width: '100%',
                                    borderBottomWidth: 2,
                                    marginBottom: 20,
                                    paddingBottom: 20,
                                    borderColor: mainColor,
                                  }}>
                                  <Slider
                                    value={this.state.percentage}
                                    style={{
                                      width: '85%',
                                      height: 40,
                                    }}
                                    step={1}
                                    minimumValue={1}
                                    maximumValue={15}
                                    minimumTrackTintColor="#FFFFFF"
                                    maximumTrackTintColor={mainColor}
                                    onValueChange={async value => {
                                      await this.setStateAsync({
                                        percentage: value,
                                      });
                                      await setAsyncStorageValue({
                                        percentage: value,
                                      });
                                    }}
                                  />
                                  <Text
                                    style={{
                                      width: '20%',
                                      fontSize: 24,
                                      color: '#FFF',
                                      fontWeight: 'bold',
                                    }}>
                                    {this.state.percentage}%
                                  </Text>
                                </View>
                              ) : (
                                <View
                                  style={{
                                    width: '100%',
                                    marginBottom: 20,
                                  }}
                                />
                              )}
                              <View
                                style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignContent: 'center',
                                  marginBottom: 20,
                                  width: '100%',
                                }}>
                                <Text style={[GlobalStyles.titleSaves]}>
                                  Next Withdraw Date
                                </Text>
                                <Pressable
                                  /**
                                    disabled={
                                      this.state.loading ||
                                      !(this.state.savingsDate < Date.now())
                                    }
                                  */
                                  style={[
                                    GlobalStyles.buttonStyle,
                                    {width: '50%'},
                                    this.state.loading ||
                                    !(this.state.savingsDate < Date.now())
                                      ? {opacity: 0.5}
                                      : {},
                                  ]}
                                  onPress={async () => {
                                    await this.setStateAsync({loading: true});
                                    await this.batchWithdraw();
                                    await this.setStateAsync({loading: false});
                                  }}>
                                  <Text
                                    style={{
                                      color: 'white',
                                      fontSize: 18,
                                      fontWeight: 'bold',
                                    }}>
                                    {!(this.state.savingsDate < Date.now())
                                      ? formatDate(
                                          new Date(this.state.savingsDate),
                                        )
                                      : this.state.loading
                                      ? 'Withdrawing...'
                                      : 'Withdraw Now'}
                                  </Text>
                                </Pressable>
                              </View>
                            </React.Fragment>
                          )}
                        </View>
                      </Fragment>
                    )
                  }
                  {
                    // Stage 1
                    this.state.stage === 1 && (
                      <View style={[GlobalStyles.mainSend, {height: '100%'}]}>
                        <CryptoSign
                          transaction={this.state.transaction}
                          cancelTrans={() =>
                            this.setState({
                              stage: 0,
                              explorerURL: '',
                              transaction: {},
                              check: 'Check',
                              loading: false,
                              modal: false,
                              status: 'Processing...',
                              errorText: '',
                            })
                          }
                          signEthereum={() => this.sign()}
                        />
                      </View>
                    )
                  }
                  {
                    // Stage 2
                    this.state.stage === 2 && (
                      <View
                        style={[
                          GlobalStyles.mainSend,
                          {height: Dimensions.get('screen').height * 0.64},
                        ]}>
                        <View
                          style={{
                            flex: 1,
                            flexDirection: 'column',
                            justifyContent: 'space-around',
                            alignItems: 'center',
                          }}>
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
                          <View>
                            <View
                              style={[
                                GlobalStyles.networkShow,
                                {width: Dimensions.get('screen').width * 0.9},
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
                                  {blockchain.tokens[0].icon}
                                </View>
                                <Text style={{color: 'white'}}>
                                  {`${epsilonRound(
                                    this.state.transactionDisplay.amount,
                                    4,
                                  )}`}{' '}
                                  {'APT'}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View>
                            <Pressable
                              disabled={this.state.explorerURL === ''}
                              style={[
                                GlobalStyles.buttonStyle,
                                this.state.explorerURL === ''
                                  ? {opacity: 0.5}
                                  : {},
                              ]}
                              onPress={() =>
                                Linking.openURL(this.state.explorerURL)
                              }>
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
                                  backgroundColor: secondaryColor,
                                },
                                this.state.explorerURL === ''
                                  ? {opacity: 0.5}
                                  : {},
                              ]}
                              onPress={async () => {
                                await this.refresh();
                                await this.setStateAsync({
                                  stage: 0,
                                  explorerURL: '',
                                  transaction: {},
                                  transactionDisplay:
                                    baseTab2State.transactionDisplay,
                                  check: 'Check',
                                  loading: false,
                                  modal: false,
                                  status: 'Processing...',
                                  errorText: '',
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
                        </View>
                      </View>
                    )
                  }
                </Fragment>
              ) : (
                <View
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '90%',
                  }}>
                  <Text
                    style={[
                      GlobalStyles.exoTitle,
                      {
                        textAlign: 'center',
                        fontSize: 24,
                        paddingBottom: 20,
                      },
                    ]}>
                    Create Savings Account
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      width: '100%',
                    }}>
                    <Pressable
                      disabled={this.state.loading}
                      style={[
                        GlobalStyles.buttonStyle,
                        this.state.loading ? {opacity: 0.5} : {},
                      ]}
                      onPress={() => this.setupAccount()}>
                      <Text style={[GlobalStyles.buttonText]}>
                        {this.state.loading ? 'Creating...' : 'Create Account'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Fragment>
    );
  }
}
