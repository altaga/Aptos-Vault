import React, {Component} from 'react';
import {Image, Pressable, SafeAreaView, Text, View} from 'react-native';
import IconIonicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LendingB from '../../assets/extraIcons/lendingB.png';
import LendingW from '../../assets/extraIcons/lendingW.png';
import Renders from '../../assets/logo.png';
import Title from '../../assets/title.png';
import GlobalStyles, {
  footer,
  header,
  iconSize,
  main,
  mainColor,
} from '../../styles/styles';
import ContextModule from '../../utils/contextModule';
import Tab1 from './tabs/tab1';
import Tab2 from './tabs/tab2';
import Tab3 from './tabs/tab3';

// Tabs

const BaseStateMain = {
  tab: 0, // 0
  mainHeight: main,
};

class Main extends Component {
  constructor(props) {
    super(props);
    this.state = BaseStateMain;
  }

  static contextType = ContextModule;

  componentDidMount() {
    this.props.navigation.addListener('focus', async () => {
      console.log(this.props.route.name);
    });
  }

  render() {
    return (
      <SafeAreaView style={[GlobalStyles.container]}>
        <View style={[GlobalStyles.headerMain]}>
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
                width: 559 * (header / (120 * 1.8)),
                height: 124 * (header / (120 * 1.8)),
              }}
            />
          </View>
        </View>
        <View style={[GlobalStyles.mainSend]}>
          {this.state.tab === 0 && <Tab1 {...this.props} />}
          {this.state.tab === 1 && <Tab2 navigation={this.props.navigation} />}
          {this.state.tab === 2 && <Tab3 navigation={this.props.navigation} />}
        </View>
        <View style={[GlobalStyles.footerMain]}>
          <Pressable
            style={GlobalStyles.selector}
            onPress={() =>
              this.setState({
                tab: 0,
              })
            }>
            <Icon
              name="account-balance-wallet"
              size={iconSize}
              color={this.state.tab === 0 ? mainColor : 'white'}
            />
            <Text
              style={
                this.state.tab === 0
                  ? GlobalStyles.selectorSelectedText
                  : GlobalStyles.selectorText
              }>
              Wallet
            </Text>
          </Pressable>
          <Pressable
            style={GlobalStyles.selector}
            onPress={() =>
              this.setState({
                tab: 1,
              })
            }>
            <Icon
              name="attach-money"
              size={iconSize}
              color={this.state.tab === 1 ? mainColor : 'white'}
            />
            <Text
              style={
                this.state.tab === 1
                  ? GlobalStyles.selectorSelectedText
                  : GlobalStyles.selectorText
              }>
              Savings
            </Text>
          </Pressable>
          <Pressable
            style={GlobalStyles.selector}
            onPress={() =>
              this.setState({
                tab: 2,
              })
            }>
            <IconIonicons
              name="card"
              size={iconSize}
              color={this.state.tab === 2 ? mainColor : 'white'}
            />
            <Text
              style={
                this.state.tab === 2
                  ? GlobalStyles.selectorSelectedText
                  : GlobalStyles.selectorText
              }>
              Cards
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

export default Main;
