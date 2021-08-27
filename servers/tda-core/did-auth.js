const ethutil = require("ethereumjs-util");
const ethResolver = require("ethr-did-resolver");
const Resolver = require("did-resolver");
const didJWT = require("did-jwt");
const fetch = require("node-fetch");

module.exports = function (web3, account, env, logger) {
    const tokenHeader = "DID-JWT";
    var rpc = "http" + env.ethereumUrl.substr(2);
    const verification = "verification-request";
    var nonce = {};

    var config = {
        networks: [
            {
                name: "development",
                rpcUrl: rpc,
                registry: env.contracts.did_registry.address,
            },
        ],
    };
    const ethrDid = ethResolver.getResolver(config);

    let resolver = new Resolver.Resolver(ethrDid);

    const delegateType = tokenHeader;
    const didReg = new web3.eth.Contract(
        env.contracts.did_registry.abi,
        env.contracts.did_registry.address
    );

    async function isDelegate(address) {
        var did = await resolver.resolve(
            "did:ethr:development:" + account.address
        );
        var _isDelegate = false;
        for (var idx in did.didDocument.verificationMethod) {
            var verifier = did.didDocument.verificationMethod[idx];
            if (verifier.blockchainAccountId.split("@")[0] == address) {
                _isDelegate = true;
                break;
            }
        }
        return _isDelegate;
    }

    async function issueToken(address, validity) {
        var date = Math.round(Date.now() / 1000);
        var exp = date + validity;
        if (!isDelegate(address)) {
            // issue delegacy to sender
            var tx = await addDelegateSigned(
                account,
                address,
                delegateType,
                exp
            );
        }
        return await _generateJWT(address, exp);
    }

    async function _generateJWT(subject, expiration) {
        const signer = didJWT.ES256KSigner(account.privateKey);

        var jwt = await didJWT.createJWT(
            {
                sub: subject,
                exp: expiration,
                aud: "did:ethr:development:" + account.address,
            },
            { issuer: "did:ethr:development:" + account.address, signer },
            { alg: "ES256K" }
        );
        return jwt;
    }

    async function addDelegateSigned(
        identity,
        delegate,
        delegateType,
        validity
    ) {
        const nonce = await didReg.methods
            .nonce(identity.address)
            .call({ from: identity.address });
        var delType = web3.utils.asciiToHex(delegateType);

        var hash = web3.extend.utils.soliditySha3(
            { v: "0x19", t: "bytes1" },
            { v: "0x00", t: "bytes1" },
            { v: didReg.options.address, t: "address" },
            { v: nonce, t: "uint" },
            { v: identity.address, t: "address" },
            { v: "addDelegate", t: "string" },
            { v: delType, t: "bytes32" },
            { v: delegate, t: "address" },
            { v: validity, t: "uint" }
        );

        hash = Buffer.from(hash.substr(2), "hex"); //remove 0x
        var key = Buffer.from(identity.privateKey.substr(2), "hex");
        var signature = ethutil.ecsign(hash, key);
        const r = "0x" + signature.r.toString("hex");
        const s = "0x" + signature.s.toString("hex");
        const v = signature.v;

        return await didReg.methods
            .addDelegateSigned(
                identity.address,
                v,
                r,
                s,
                delType,
                delegate,
                validity
            )
            .send({ from: identity.address, gas: 200000 });
    }

    /**
     * Checks if user address is in the registry.
     * @param {address} sender
     * @returns {<0} if identity check failed, {>=0} otherwise
     */
    async function checkIdentity(sender, collectionRegistry) {
        var query = { address: sender.toLowerCase() };
        var result = await collectionRegistry.findOne(query);

        if (result) {
            // user is known to the system
            // perform challenge response to verify identity using challenge-response
            return _getNonce(sender);
        } else {
            throw { error: "User does not exist in the system" };
        }
    }

    /**
     * Verifies the signature of the sender using the nonce.
     * @param {address} sender
     * @param {message,messageHash,signature,v,r,s} signature object
     * @returns true if sender is signer, otherwise false
     */
    async function verify(sender, signature) {
        var recoveredSigner = await web3.eth.accounts.recover(signature);
        return recoveredSigner == sender;
    }

    function _getNonce(address) {
        if (nonce.hasOwnProperty(address)) {
            return nonce[address]++;
        } else {
            nonce[address] = 1;
            return 0;
        }
    }

    /**
     * Verifies the validity of the token.
     * @param {*} jwt
     * @returns true if valid, otherwise false
     */
    async function isTokenValid(jwt) {
        try {
            const response = await didJWT.verifyJWT(jwt, {
                resolver: resolver,
                audience: "did:ethr:development:" + account.address,
            });

            // checks if issuer is not self
            if (
                response.signer.blockchainAccountId
                    .split("@")[0]
                    .toLowerCase() !== account.address.toLowerCase()
            ) {
                // checks if signer is a delegate
                return await isDelegate(response.signer.ethereumAddress);
            }

            return true; // no exceptions thrown -> jwt is valid
        } catch (error) {
            logger.error(error);
            return false;
        }
    }

    /**
     * Rejects user in case jwt is expired or not provided.
     * Redirects user to login page.
     *
     * @param {*} request
     * @param {*} response
     * @param {*} msg
     */
    function reject(response) {
        logger.debug("rejecting");
        const os = require("os");
        var IP = os.networkInterfaces()["wlp2s0"][0].address;
        // forward user to originating idm server
        var url = `http://${IP}:${env.idm.port}`;
        response.redirect(301, url);
    }

    return {
        checkIdentity,
        issueToken,
        isTokenValid,
        reject,
        tokenHeader,
    };
};
