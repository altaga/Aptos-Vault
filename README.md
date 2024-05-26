# Aptos Vault

Aptos Vault Wallet: Batch transactions, optimized savings, and seamless card payments.

<img src="https://i.ibb.co/V9zNxzP/Featured.png">

## Fast Links:

WALLET CODE: [CODE](./Aptos_Vault/)

PLAYSTORE: [LINK](https://play.google.com/store/apps/details?id=com.altaga.aptosvault)

VIDEODEMO: [VIDEO](PENDING...)

# System Diagrams:

<img src="https://i.ibb.co/GvRKHZV/Aptos-Vault-drawio.png">

- Main Account: Dentro del esquema puedes observar que tenemos nuestra main wallet, la cual es una Non Custodial Wallet, a la cual tendras que guardar el mmnemonico de la misma al momento de su creacion.

- Savings Account: Esta wallet a diferencia de la anterior es una Custodial Wallet, la cual guardara los ahorros sobre cada transaccion segun el protocolo de savings elegido.

- Card Account: Esta wallet igual a la anterior es una Custodial Wallet, esta a diferencia de ser controlada mediante la Main Account, es controlada mediante el hash de la tajeta que se la haga merge cuando se crea la cuenta.

- Batch Transactions: Gracias a la red de Aptos, es posible realizar varias transacciones en batch mediante una sola firma, esto nos permite todas las increibles funcionalidades de nuestra wallet.

# Introduction:

APTOS-Vault is a blockchain wallet and platform that empowers underserverd communities through saving. Employing novel Blockchain technologies thrugh APTOS such as Batch transactions and optimized savings. It also combines it with TradFi via seamless card payments.

## Wallet:

Nuestra pantalla principal es nuestra Main Account, la cual es una wallet tradicional para hacer management de nuestros assets. Todos los balances y coins estan en **Mainnet** y el codigo de esta pantalla es el siguiente. [CODE](./Aptos_Vault/src/screens/main/tabs/tab1.js)

<img src="https://i.ibb.co/JkpkS3r/Screenshot-20240523-160853.png" width="32%">

## Send:

Esta pantalla es importante y que nos permite realizar transferencias sencillas o en batch desde nuestra wallet. Y el codigo de esta pantalla es el siguiente. [CODE](./Aptos_Vault/src/screens/sendWallet/sendWallet.js)

<img src="https://i.ibb.co/jrtYYZf/Screenshot-20240523-182604.png" width="32%"> <img src="https://i.ibb.co/qFh55Z7/Screenshot-20240523-182744.png" width="32%"> <img src="https://i.ibb.co/xJXSbNg/vlcsnap-2024-05-05-13h55m31s607.png" width="32%">

Cabe recordar que si esta activa la cuenta de Savings, se agregara una transaccion mas a la transferencia final hacia nuestra cuenta de ahorros, todo esto es muy sencillo de hacer con Aptos, incluso siendo Mastercard uno de los clientes de la misma [2](#references).

## Receive:

With this screen, you can easily show your Wallet to receive funds, whether Aptos or Coins y el codigo de esta pantalla es el siguiente. [CODE](./Aptos_Vault/src/screens/depositWallet/depositWallet.js) 

<img src="https://i.ibb.co/rtfCKXn/Screenshot-20240523-182951.png" width="32%">

## Payment: 

In this tab we intend to make it the same as using a traditional POS, this allows us to enter the amount to be charged in American dollars and to be able to make the payment with one of our virtual cards. Y el codigo de esta pantalla es el siguiente. [CODE](./Aptos_Vault/src/screens/paymentWallet/paymentWallet.js)

<img src="https://i.ibb.co/qDMn0GT/Screenshot-20240523-183115.png" width="32%"> <img src="https://i.ibb.co/6vbwCzx/Screenshot-20240523-183124.png" width="32%"> <img src="https://i.ibb.co/Mk8snVP/Screenshot-20240523-183500.png" width="32%">

As you can see, since it is a Custodial Account Card, we can review the amount of money it has in all the available coins to be able to make the payment with any of them, whether it is an Aptos or Coins.

<img src="https://i.ibb.co/F745TtX/Screenshot-20240523-183506.png" width="32%"> <img src="https://i.ibb.co/DgBssTZ/Screenshot-20240523-183512.png" width="32%"> <img src="https://i.ibb.co/jh6RfDZ/Screenshot-20240523-183521.png" width="32%">

Finally, if our device has the option to print the purchase receipt, it can be printed immediately. Todos los pagos son realizados sobre la Mainnet de Aptos, esto con el fin de tener una forma de pagos rapida y segura gracias a las 160,000 transacciones por segundo que soporta la red sin perder su seguridad. [3](#references).

## Savings:

La cuenta de savings es una Custodial Wallet la cual nos permite tener ahorros basados en protocolos, estos protocolos los explicaremos un poco mas adelante, sin embargo en esta pantalla podras realizar el withdraw de los savings segun la fecha definida y el codigo de esta pantalla es el siguiente. [CODE](./Aptos_Vault/src/screens/main/tabs/tab2.js)

<img src="https://i.ibb.co/k94B3Dg/Screenshot-20240523-183800.png" width="32%"> <img src="https://i.ibb.co/PmmFfZg/Screenshot-20240523-183803.png" width="32%"> <img src="https://i.ibb.co/xzvw6hJ/Screenshot-20240523-183805.png" width="32%">

### Savings Protocol:

- Balanced Protocol, this protocol performs a weighted rounding according to the amount to be paid in the transaction, so that the larger the transaction, the greater the savings, in order not to affect the user. Y el codigo de esta funcion es el siguiente. [CODE](./Aptos_Vault/src/utils/utils.js)

        export function balancedSavingToken(number, usd1, usd2) {
            const balance = number * usd1;
            let amount = 0;
            if (balance <= 1) {
                amount = 1;
            } else if (balance > 1 && balance <= 10) {
                amount = Math.ceil(balance);
            } else if (balance > 10 && balance <= 100) {
                const intBalance = parseInt(balance, 10);
                const value = parseInt(Math.round(intBalance).toString().slice(-2), 10);
                let unit = parseInt(Math.round(intBalance).toString().slice(-1), 10);
                let decimal = parseInt(Math.round(intBalance).toString().slice(-2, -1), 10);
                if (unit < 5) {
                unit = '5';
                decimal = decimal.toString();
                } else {
                unit = '0';
                decimal = (decimal + 1).toString();
                }
                amount = intBalance - value + parseInt(decimal + unit, 10);
            } else if (balance > 100) {
                const intBalance = parseInt(Math.floor(balance / 10), 10);
                amount = (intBalance + 1) * 10;
            }
            return new Decimal(amount).sub(new Decimal(balance)).div(usd2).toNumber();
        }

- Percentage protocol, unlike the previous protocol, this one aims to always save a percentage selected in the UI. Y el codigo de esta funcion es el siguiente. [CODE](./Aptos_Vault/src/utils/utils.js)

        export function percentageSaving(number, percentage) {
            return number * (percentage / 100);
        }

## Cards:

Finally, in the cards section, we can create a virtual card, which will help us make payments without the need for our wallet directly with a physical card in any POS terminal with Aptos Vault. Y el codigo de esta pantalla es el siguiente. [CODE](./Aptos_Vault/src/screens/main/tabs/tab3.js)

<img src="https://i.ibb.co/4TNpXRT/Screenshot-20240523-183819.png" width="32%"> <img src="https://i.ibb.co/ZXwCFys/Screenshot-20240523-183821.png" width="32%"> <img src="https://i.ibb.co/S61Dd3X/Screenshot-20240523-183826.png" width="32%">

Los codigos de las fuinciones para crear una tarjeta y hacer transacciones con ella son los siguientes.

- [ADD CARD](./Cloud%20Functions/AddCard.js)
- [WITHDRAW CARD](./Cloud%20Functions/WithdrawCard.js)

# References:

1. https://blog.quicknode.com/aptos-network-quicknode-solving-blockchain-challenges-with-scalability-to-move-web3-towards-widespread-adoption/
2. https://aptosfoundation.org/use-cases/defi
3. https://medium.com/@idoexist99/aptos-the-speedy-new-blockchain-built-for-cool-dapps-2f39c55f8d56
