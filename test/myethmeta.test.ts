import { ethers } from "hardhat";
import { expect, assert } from "chai";
import { MyETHMeta } from "../typechain-types";
import { SignTypedDataVersion, recoverTypedSignature } from "@metamask/eth-sig-util"

describe("MyETHMeta tests", function () {
    let contract: MyETHMeta;
    let owner: string;
    let user1: any;
    let domain: any;

    before(async function () {
        const [deployer, user] = await ethers.getSigners();
        owner = deployer.address;
        user1 = user;

        const MyETHMeta = await ethers.getContractFactory("MyETHMeta");
        contract = await MyETHMeta.deploy();

        domain = {
            name: "MyETHMeta",
            version: "1",
            chainId: 31337,
            verifyingContract: await contract.getAddress(),
        }
    });

    it("should set and get MetaURI", async function () {
        const uri = "https://example.com/meta";
        await contract.setMetaURI(uri);
        expect(await contract.getMetaURI(owner)).to.equal(uri);
    });

    it("should get the correct nonce", async function () {
        expect(await contract.getNonce(owner)).to.equal(0);
    });

    it("should emit MetaURIChanged event", async function () {
        const uri = "https://example.com/meta";
        await expect(contract.setMetaURI(uri))
            .to.emit(contract, "MetaURIChanged")
            .withArgs(owner, uri);
    });

    const EIP712Domain = {
        "EIP712Domain": [
            {
                "name": "name",
                "type": "string"
            },
            {
                "name": "version",
                "type": "string"
            },
            {
                "name": "chainId",
                "type": "uint256"
            },
            {
                "name": "verifyingContract",
                "type": "address"
            }
        ]
    }

    it("recoverTypedSignature should return the signer", async function () {
        const uri = "https://example.com/meta";
        const nonce = 0;
        const types = {
            "SetMetaURI": [
                { name: "owner", type: "address" },
                { name: "uri", type: "string" },
                { name: "nonce", type: "uint256" },
            ]
        }
        const message = {
            owner: user1.address,
            uri: uri,
            nonce: nonce,
        }
        const signature = await user1.signTypedData(domain, types, message);
        const recorveredAddress = recoverTypedSignature({
            data: {
                "types": {
                    ...EIP712Domain,
                    ...types
                },
                "primaryType": "SetMetaURI",
                "domain": domain,
                "message": message
            },
            signature: signature,
            version: SignTypedDataVersion.V4
        })
        assert.equal(recorveredAddress.toLowerCase(), user1.address.toLowerCase())
    })

    it("should set MetaURI with valid signature", async function () {
        const uri = "https://example.com/meta";
        const nonce = await contract.getNonce(user1.address);
        const types = {
            "SetMetaURI": [
                { name: "owner", type: "address" },
                { name: "uri", type: "string" },
                { name: "nonce", type: "uint256" },
            ]
        }
        const message = {
            owner: user1.address,
            uri: uri,
            nonce: nonce,
        };

        const signature = await user1.signTypedData(domain, types, message);
        await contract.setMetaURIMetaTX(user1.address, uri, nonce, signature);
        expect(await contract.getMetaURI(user1.address)).to.equal(uri);
    });
});