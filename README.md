# Aptos Vault

Aptos Vault Wallet: Batch transactions, smart savings, and easy card payments.

<img src="https://i.ibb.co/V9zNxzP/Featured.png">

## Fast Links:

WALLET CODE: [CODE](./Aptos_Vault/)

PLAYSTORE: [LINK](https://play.google.com/store/apps/details?id=com.altaga.aptosvault)

VIDEODEMO: [VIDEO](PENDING...)

# System Diagrams:

<img src="https://i.ibb.co/GvRKHZV/Aptos-Vault-drawio.png">

- Main Account:
- Savings Account:
- Card Account:
- Batch Transactions:

# Screens:

Aptos Vault 

## Wallet:

 [CODE](./Aptos_Vault/src/screens/main/tabs/tab1.js)

<img src="https://i.ibb.co/JkpkS3r/Screenshot-20240523-160853.png" width="32%">





## Send:

 [CODE](./Aptos_Vault/src/screens/sendWallet/sendWallet.js)

<img src="https://i.ibb.co/jrtYYZf/Screenshot-20240523-182604.png" width="32%"> <img src="https://i.ibb.co/qFh55Z7/Screenshot-20240523-182744.png" width="32%"> <img src="https://i.ibb.co/xJXSbNg/vlcsnap-2024-05-05-13h55m31s607.png" width="32%">



## Receive:

With this screen, you can easily show your Wallet to receive funds, whether Aptos or Coins [CODE](./Aptos_Vault/src/screens/depositWallet/depositWallet.js) 

<img src="https://i.ibb.co/rtfCKXn/Screenshot-20240523-182951.png" width="32%">

## Payment: 

In this tab we intend to make it the same as using a traditional POS, this allows us to enter the amount to be charged in American dollars and to be able to make the payment with one of our virtual cards. [CODE](./Aptos_Vault/src/screens/paymentWallet/paymentWallet.js)

<img src="https://i.ibb.co/qDMn0GT/Screenshot-20240523-183115.png" width="32%"> <img src="https://i.ibb.co/6vbwCzx/Screenshot-20240523-183124.png" width="32%"> <img src="https://i.ibb.co/Mk8snVP/Screenshot-20240523-183500.png" width="32%">

As you can see, since it is a Custodial Account Card, we can review the amount of money it has in all the available coins to be able to make the payment with any of them, whether it is an Aptos or Coins.

<img src="https://i.ibb.co/F745TtX/Screenshot-20240523-183506.png" width="32%"> <img src="https://i.ibb.co/DgBssTZ/Screenshot-20240523-183512.png" width="32%"> <img src="https://i.ibb.co/jh6RfDZ/Screenshot-20240523-183521.png" width="32%">

Finally, if our device has the option to print the purchase receipt, it can be printed immediately.

## Savings:

 [CODE](./Aptos_Vault/src/screens/main/tabs/tab2.js)

<img src="https://i.ibb.co/k94B3Dg/Screenshot-20240523-183800.png" width="32%"> <img src="https://i.ibb.co/PmmFfZg/Screenshot-20240523-183803.png" width="32%"> <img src="https://i.ibb.co/xzvw6hJ/Screenshot-20240523-183805.png" width="32%">



### Savings Protocol:

- Balanced Protocol, this protocol performs a weighted rounding according to the amount to be paid in the transaction, so that the larger the transaction, the greater the savings, in order not to affect the user. [CODE](./Aptos_Vault/src/utils/utils.js)

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

- Percentage protocol, unlike the previous protocol, this one aims to always save a percentage selected in the UI. [CODE](./Aptos_Vault/src/utils/utils.js)

        export function percentageSaving(number, percentage) {
            return number * (percentage / 100);
        }

## Cards:

Finally, in the cards section, we can create a virtual card, which will help us make payments without the need for our wallet directly with a physical card in any POS terminal with Aptos Vault. [CODE](./Cloud%20Functions/Add%20Card/index.js)

<img src="https://i.ibb.co/4TNpXRT/Screenshot-20240523-183819.png" width="32%"> <img src="https://i.ibb.co/ZXwCFys/Screenshot-20240523-183821.png" width="32%"> <img src="https://i.ibb.co/S61Dd3X/Screenshot-20240523-183826.png" width="32%">

 [CODE](./Cloud%20Functions/Card%20Transaction/index.js)



