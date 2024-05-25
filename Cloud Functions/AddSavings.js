const functions = require('@google-cloud/functions-framework');
const crypto = require("crypto");
const Firestore = require("@google-cloud/firestore");
const {
  Account,
} = require("@aptos-labs/ts-sdk");

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
-----END RSA PRIVATE KEY-----`;

const db = new Firestore({
  projectId: "aptos-vault",
  keyFilename: "credential.json",
});

const Accounts = db.collection("XXXXXXXXX");    

functions.http('helloHttp', async (req, res) => {
   try {
    const decrypted = decryptText(req.body.data);
    const pubKey = req.body.pubKey;
    const query = await Accounts.where("publicKey", "==", pubKey).get();
    if (query.empty) {
      const account = Account.generate();
      const savingsPublicKey = account.accountAddress.toString();
      const savingsPrivateKey = '0x'+HexString(account.privateKey.toUint8Array());
      await Accounts.doc(pubKey).set({
        saveHash: decrypted.toString(),
        publicKey: pubKey,
        savingsPublicKey,
        savingsPrivateKey
      });
      res.send(savingsPublicKey);
    } else {
      throw "Bad Request";
    }
  } catch (e) {
    res.send(`Bad Request`);
  }
});

// utils

function decryptText(encryptedText) {
  return crypto.privateDecrypt(
    {
      key: privateKey,
    },
    Buffer.from(encryptedText, "base64")
  );
}

function HexString(uint8Array) {
  return Array.from(uint8Array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}