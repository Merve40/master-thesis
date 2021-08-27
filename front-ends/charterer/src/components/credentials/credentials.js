import { EthrDID } from "ethr-did";
import {
    Issuer,
    JwtCredentialPayload,
    createVerifiableCredentialJwt,
    JwtPresentationPayload,
    createVerifiablePresentationJwt,
    verifyCredential,
    verifyPresentation,
} from "did-jwt-vc";
import { Resolver } from "did-resolver";
import { getResolver } from "ethr-did-resolver";
import { ES256KSigner } from "did-jwt";

var config = null;
async function getConfig() {
    if (!config) {
        var web3 = process.env.REACT_APP_WEB3;

        var response = await fetch(
            `${process.env.REACT_APP_BROKER}/contract/EthereumDIDRegistry`
        );

        var registry = (await response.json()).address;
        config = {
            networks: [
                {
                    name: "development",
                    rpcUrl: `http${web3.substr(2)}`,
                    registry,
                },
            ],
        };
    }
    return config;
}

async function getIssuer(_signer) {
    var conf = (await getConfig()).networks[0];
    const signer = ES256KSigner(_signer.privateKey);

    const issuer = new EthrDID({
        identifier: _signer.address,
        privateKey: _signer.privateKey,
        rpcUrl: conf.rpcUrl,
        chainNameOrId: conf.name,
        registry: conf.registry,
        signer,
    });
    return issuer;
}

/**
 * Wrapper function for handling errors
 */
async function doWithErrorHandling(func) {
    try {
        return await func();
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function issue(signer, subject, date, credentialType, data) {
    return await doWithErrorHandling(async () => {
        const issuer = await getIssuer(signer);
        const vcPayload = {
            sub: subject,
            nbf: date,
            vc: {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiableCredential", credentialType],
                credentialSubject: data,
            },
        };
        return await createVerifiableCredentialJwt(vcPayload, issuer);
    });
}

export async function verify(credential) {
    return await doWithErrorHandling(async () => {
        const conf = await getConfig();
        let resolver = new Resolver(getResolver(conf));
        return await verifyCredential(credential, resolver);
    });
}
