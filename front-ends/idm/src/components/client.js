const idm = process.env.REACT_APP_IDM;

/**
 * Authenticates the ethereum account by performing a challenge-response.
 *
 * @param {web3} web3 instance
 * @param {string} privateKey
 * @param {string} ens (ethereum name service)
 * @returns {boolean, object} true if successful otherwise false, error or result
 */
export async function authenticate(web3, privateKey, ens) {
  var account;

  try {
    account = web3.eth.accounts.privateKeyToAccount(privateKey);
  } catch (error) {
    return [false, "Invalid private key"];
  }

  // fetch a challenge from IDM server
  var response = await fetch(`${idm}/challenge/${account.address}`, {
    method: "get",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
    },
  });
  var data = await response.json();
  if (response.status == 500) {
    return [false, data.error];
  }

  var signature = await createSignature(web3, account, data.nonce);

  response = await fetch(
    `${idm}/authenticate?address=${account.address}&broker=${ens}&signature=${signature}`,
    {
      method: "get",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  data = await response.json();
  if (response.status == 500) {
    return [false, data.error];
  }
  data.address = account.address;
  return [true, data]; // data: jwt, brokerUrl
}

export function setCookie(name, value, exp) {
  var expires = "";
  if (exp) {
    var date = new Date();
    date.setTime(exp);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie =
    name + "=" + (value || "") + expires + "; SameSite=Lax; path=/";
}

/**
 * Computes a new signature.
 * @param {int} nonce
 */
async function createSignature(web3, account, nonce) {
  var hash = web3.eth.accounts.hashMessage(nonce);
  return await account.sign(hash).signature;
}
