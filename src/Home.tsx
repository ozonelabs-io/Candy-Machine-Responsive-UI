import {useEffect, useState} from "react";
import styled from "styled-components";
import confetti from "canvas-confetti";
import * as anchor from "@project-serum/anchor";
import {LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {useAnchorWallet} from "@solana/wallet-adapter-react";
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import {GatewayProvider} from '@civic/solana-gateway-react';
import Countdown from "react-countdown";
import {Snackbar, Paper, LinearProgress, Chip} from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import {toDate, AlertState, getAtaForMint} from './utils';
import {MintButton} from './MintButton';
import {MultiMintButton} from './MultiMintButton';
import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
  mintMultipleToken,
  CANDY_MACHINE_PROGRAM,
} from "./candy-machine";
import { ENGINE_METHOD_PKEY_METHS } from "constants";

const cluster = process.env.REACT_APP_SOLANA_NETWORK!.toString();
const decimals = process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS
  ? +process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS!.toString()
  : 9;
const splTokenName = process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME
  ? process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME.toString()
  : "TOKEN";

const WalletContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  background: black;
  padding: 0.6em;
  background: #020202bf;
  z-index: 1;
`;

const Menu = styled.ul`
  list-style: none;
  display: relative;
  flex: 1 0 auto;
  margin: 0px;
`;
const Logo = styled.div`
  padding
  display: flex;
  -webkit-flex-direction: row;
  -ms-flex-direction: row;
  flex-direction: row;
  -webkit-flex-wrap: wrap;
  -ms-flex-wrap: wrap;
  flex-wrap: wrap;
  -webkit-box-pack: center;
  -webkit-justify-content: center;
  -ms-flex-pack: center;
  justify-content: space-between !important;

  overflow: hidden;
  position: fixed;
  bottom: 0;
  width: 100%;
  z-index:1;
`;

const WalletAmount = styled.div`
  color: black;
  width: auto;
  padding: 5px 5px 5px 16px;
  min-width: 48px;
  min-height: auto;
  border-radius: 22px;
  background-color: var(--main-text-color);
  box-shadow: 0px 3px 5px -1px rgb(0 0 0 / 20%),
    0px 6px 10px 0px rgb(0 0 0 / 14%), 0px 1px 18px 0px rgb(0 0 0 / 12%);
  box-sizing: border-box;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
    box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
    border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  font-weight: 500;
  line-height: 1.75;
  text-transform: uppercase;
  border: 0;
  margin: 0;
  display: inline-flex;
  outline: 0;
  position: relative;
  align-items: center;
  user-select: none;
  vertical-align: middle;
  justify-content: flex-start;
  gap: 10px;
`;

const Wallet = styled.ul`
  flex: 0 0 auto;
  padding: 0;
  margin-right: 3.5em !important;
  margin: 0px;
  justify-content: right;
`;
const index2 = styled.ul`
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
`;

const ConnectButton = styled(WalletMultiButton)`
  border-radius: 18px !important;
  padding: 6px 16px;
  background-color: #fa26a0;
  margin: 0 auto;
`;

const NFT = styled(Paper)`
  min-width: 32em !important;
  margin: 0 auto;
  padding: 5px 20px 20px 20px;
  flex: 1 1 auto;
  background-color: var(--card-background-color) !important;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22) !important;
  margin-top: 6em;
`;

const Card = styled(Paper)`
  display: inline-block;
  background-color: var(--countdown-background-color) !important;
  margin: 5px;
  min-width: 40px;
  padding: 24px;
  h1 {
    margin: 0px;
  }
`;

const MintButtonContainer = styled.div`
  button.MuiButton-contained:not(.MuiButton-containedPrimary) {
    color: #fff;
    border-radius: 50px;
    width: 250px;
  }

  button.MuiButton-contained:not(.MuiButton-containedPrimary):hover,
  button.MuiButton-contained:not(.MuiButton-containedPrimary):focus {
    -webkit-animation: pulse 1s;
    animation: pulse 1s;
    box-shadow: 0 0 0 2em rgba(255, 255, 255, 0);
  }

  @-webkit-keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }
`;
const loading = styled(LinearProgress)`
  border: 0.5px solid black;
  border-radius: 6px;
  width: 250px;
  height: 50px;
  background: linear-gradient(to bottom, #3399ff 10%, #ff99cc 12%);
`;

const SolExplorerLink = styled.a`
  color: #665e63ad;
  font-weight: bold;
  list-style-image: none;
  list-style-position: outside;
  list-style-type: none;
  outline: none;
  text-size-adjust: 100%;

  :hover {
    border-bottom: 2px solid var(--title-text-color);
  }
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;

  text-align: center;
  justify-content: center;
`;

const MintContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 20px;
  z-index: 1;
`;

const DesContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 20px;
`;

const Price = styled(Chip)`
  position: absolute;
  font-weight: bold;
  font-size: 1.2em !important;
  font-family: "Patrick Hand", cursive !important;
`;

const Image = styled.div`
  height: 400px;
  width: auto;
  border-radius: 7px;
  box-shadow: 5px 5px 40px 5px rgba(0, 0, 0, 0.5);
`;

const BorderLinearProgress = styled(LinearProgress)`
  margin-left: 8em;
  width: 21em !important;
  height: 1.5em !important;
  border-radius: 30px;
  box-shadow: 5px 5px 40px 5px rgba(0, 0, 0, 0.5);
  background-color: var(--main-text-color) !important;
  text-align: centre;
  > div.MuiLinearProgress-barColorPrimary {
    background-image: linear-gradient(to  right, #0e93f1  50%,#fa26a0 ) !important;
  }

  > div.MuiLinearProgress-bar1Determinate {
    border-radius: 30px !important;
    background:
    linear-gradient(to right,#c406f3 0%,#4152c5 50%,#139bcf 100% ) left/var(--p,100%) fixed,pink`;

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  txTimeout: number;
  rpcHost: string;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
  const [isActive, setIsActive] = useState(false); // true when countdown completes or whitelisted
  const [solanaExplorerLink, setSolanaExplorerLink] = useState<string>("");
  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [payWithSplToken, setPayWithSplToken] = useState(false);
  const [price, setPrice] = useState(0);
  const [priceLabel, setPriceLabel] = useState<string>("SOL");
  const [whitelistPrice, setWhitelistPrice] = useState(0);
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);
  const [isBurnToken, setIsBurnToken] = useState(false);
  const [whitelistTokenBalance, setWhitelistTokenBalance] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [endDate, setEndDate] = useState<Date>();
  const [isPresale, setIsPresale] = useState(false);
  const [isWLOnly, setIsWLOnly] = useState(false);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const rpcUrl = props.rpcHost;
  const solFeesEstimation = 0.012; // approx of account creation fees
  console.log(
    "id 8hE6HPFcTRPvWPZNfZF85gF5xptzsNhV97wXYkKVEf3L",
    solanaExplorerLink
  );

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const cndy = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setCandyMachine(cndy);
      setItemsAvailable(cndy.state.itemsAvailable);
      setItemsRemaining(cndy.state.itemsRemaining);
      setItemsRedeemed(cndy.state.itemsRedeemed);

      var divider = 1;
      if (decimals) {
        divider = +("1" + new Array(decimals).join("0").slice() + "0");
      }

      // detect if using spl-token to mint
      if (cndy.state.tokenMint) {
        setPayWithSplToken(true);
        // Customize your SPL-TOKEN Label HERE
        // TODO: get spl-token metadata name
        setPriceLabel(splTokenName);
        setPrice(cndy.state.price.toNumber() / divider);
        setWhitelistPrice(cndy.state.price.toNumber() / divider);
      } else {
        setPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
        setWhitelistPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
      }

      // fetch whitelist token balance
      if (cndy.state.whitelistMintSettings) {
        setWhitelistEnabled(true);
        setIsBurnToken(cndy.state.whitelistMintSettings.mode.burnEveryTime);
        setIsPresale(cndy.state.whitelistMintSettings.presale);
        setIsWLOnly(
          !isPresale && cndy.state.whitelistMintSettings.discountPrice === null
        );

        if (
          cndy.state.whitelistMintSettings.discountPrice !== null &&
          cndy.state.whitelistMintSettings.discountPrice !== cndy.state.price
        ) {
          if (cndy.state.tokenMint) {
            setWhitelistPrice(
              cndy.state.whitelistMintSettings.discountPrice?.toNumber() /
                divider
            );
          } else {
            setWhitelistPrice(
              cndy.state.whitelistMintSettings.discountPrice?.toNumber() /
                LAMPORTS_PER_SOL
            );
          }
        }

        let balance = 0;
        try {
          const tokenBalance = await props.connection.getTokenAccountBalance(
            (
              await getAtaForMint(
                cndy.state.whitelistMintSettings.mint,
                wallet.publicKey
              )
            )[0]
          );

          balance = tokenBalance?.value?.uiAmount || 0;
        } catch (e) {
          console.error(e);
          balance = 0;
        }
        setWhitelistTokenBalance(balance);
        setIsActive(isPresale && !isEnded && balance > 0);
      } else {
        setWhitelistEnabled(false);
      }

      // end the mint when date is reached
      if (cndy?.state.endSettings?.endSettingType.date) {
        setEndDate(toDate(cndy.state.endSettings.number));
        if (
          cndy.state.endSettings.number.toNumber() <
          new Date().getTime() / 1000
        ) {
          setIsEnded(true);
          setIsActive(false);
        }
      }
      // end the mint when amount is reached
      if (cndy?.state.endSettings?.endSettingType.amount) {
        let limit = Math.min(
          cndy.state.endSettings.number.toNumber(),
          cndy.state.itemsAvailable
        );
        setItemsAvailable(limit);
        if (cndy.state.itemsRedeemed < limit) {
          setItemsRemaining(limit - cndy.state.itemsRedeemed);
        } else {
          setItemsRemaining(0);
          cndy.state.isSoldOut = true;
          setIsEnded(true);
        }
      } else {
        setItemsRemaining(cndy.state.itemsRemaining);
      }

      if (cndy.state.isSoldOut) {
        setIsActive(false);
      }
    })();
  };

  const renderGoLiveDateCounter = ({ days, hours, minutes, seconds }: any) => {
    return (
      <div>
        <Card elevation={1}>
          <h1>{days}</h1>Days
        </Card>
        <Card elevation={1}>
          <h1>{hours}</h1>
          Hours
        </Card>
        <Card elevation={1}>
          <h1>{minutes}</h1>Mins
        </Card>
        <Card elevation={1}>
          <h1>{seconds}</h1>Secs
        </Card>
      </div>
    );
  };

  const renderEndDateCounter = ({ days, hours, minutes }: any) => {
    let label = "";
    if (days > 0) {
      label += days + " days ";
    }
    if (hours > 0) {
      label += hours + " hours ";
    }
    label += minutes + 1 + " minutes left to MINT.";
    return (
      <div>
        <h3>{label}</h3>
      </div>
    );
  };

  function displaySuccess(mintPublicKey: any, qty: number = 1): void {
    let remaining = itemsRemaining - qty;
    setItemsRemaining(remaining);
    setIsSoldOut(remaining === 0);
    if (isBurnToken && whitelistTokenBalance && whitelistTokenBalance > 0) {
      let balance = whitelistTokenBalance - qty;
      setWhitelistTokenBalance(balance);
      setIsActive(isPresale && !isEnded && balance > 0);
    }
    setItemsRedeemed(itemsRedeemed + qty);
    if (!payWithSplToken && balance && balance > 0) {
      setBalance(
        balance -
          (whitelistEnabled ? whitelistPrice : price) * qty -
          solFeesEstimation
      );
    }
    setSolanaExplorerLink(
      cluster === "devnet" || cluster === "testnet"
        ? "https://solscan.io/token/" + mintPublicKey + "?cluster=" + cluster
        : "https://solscan.io/token/" + mintPublicKey
    );
    throwConfetti();
  }

  function throwConfetti(): void {
    confetti({
      particleCount: 400,
      spread: 70,
      origin: { y: 0.6 },
    });
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function mintMany(quantityString: number) {
    if (wallet && candyMachine?.program && wallet.publicKey) {
      const quantity = Number(quantityString);
      const futureBalance =
        (balance || 0) -
        (whitelistEnabled && whitelistTokenBalance > 0
          ? whitelistPrice
          : price) *
          quantity;
      const signedTransactions: any = await mintMultipleToken(
        candyMachine,
        wallet.publicKey,
        quantity
      );

      const promiseArray = [];

      for (let index = 0; index < signedTransactions.length; index++) {
        const tx = signedTransactions[index];
        promiseArray.push(
          awaitTransactionSignatureConfirmation(
            tx,
            props.txTimeout,
            props.connection,
            "singleGossip",
            true
          )
        );
      }

      const allTransactionsResult = await Promise.all(promiseArray);
      let totalSuccess = 0;
      let totalFailure = 0;

      for (let index = 0; index < allTransactionsResult.length; index++) {
        const transactionStatus = allTransactionsResult[index];
        if (!transactionStatus?.err) {
          totalSuccess += 1;
        } else {
          totalFailure += 1;
        }
      }

      let retry = 0;
      if (allTransactionsResult.length > 0) {
        let newBalance =
          (await props.connection.getBalance(wallet.publicKey)) /
          LAMPORTS_PER_SOL;

        while (newBalance > futureBalance && retry < 20) {
          await sleep(2000);
          newBalance =
            (await props.connection.getBalance(wallet.publicKey)) /
            LAMPORTS_PER_SOL;
          retry++;
          console.log(
            "Estimated balance (" +
              futureBalance +
              ") not correct yet, wait a little bit and re-check. Current balance : " +
              newBalance +
              ", Retry " +
              retry
          );
        }
      }

      if (totalSuccess && retry < 20) {
        setAlertState({
          open: true,
          message: `You've Successfully Minted ${quantity} ODKings!`,
          severity: "success",
        });

        // update front-end amounts
        displaySuccess(wallet.publicKey, quantity);
      }

      if (totalFailure || retry === 20) {
        setAlertState({
          open: true,
          message: `Some mints failed! (possibly ${totalFailure}) Wait a few minutes and check your wallet.`,
          severity: "error",
        });
      }

      if (totalFailure === 0 && totalSuccess === 0) {
        setAlertState({
          open: true,
          message: `Mints manually cancelled.`,
          severity: "error",
        });
      }
    }
  }

  async function mintOne() {
    if (wallet && candyMachine?.program && wallet.publicKey) {
      const mint = anchor.web3.Keypair.generate();
      const mintTxId = (
        await mintOneToken(candyMachine, wallet.publicKey, mint)
      )[0];

      let status: any = { err: true };
      if (mintTxId) {
        status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          true
        );
      }

      if (!status?.err) {
        setAlertState({
          open: true,
          message: "You've Successfully Minted Minted ODKings",
          severity: "success",
        });

        // update front-end amounts
        displaySuccess(mint.publicKey);
      } else {
        setAlertState({
          open: true,
          message: "Mint failed! Please try again!",

          severity: "error",
        });
      }
    }
  }

  const startMint = async (quantityString: number) => {
    try {
      setIsMinting(true);
      if (quantityString === 1) {
        await mintOne();
      } else {
        await mintMany(quantityString);
      }
    } catch (error: any) {
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (!error.message) {
          message = "Transaction Timeout! Please try again.";
        } else if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setIsMinting(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
    isEnded,
    isPresale,
  ]);
  return (
    <main>
      <MainContainer>
        <WalletContainer>
          {wallet
            ? "Wallet Connected successfully"
            : "Please connect your wallet"}
        </WalletContainer>
        <br />
        <Logo>
          <WalletContainer>
            <Menu>
              {wallet && isActive && (
                <div className="container">
                  <div className="progressbar-container">
                    <div
                      className="progressbar-complete"
                      style={{
                        width: `${
                          100 - (itemsRemaining * 100) / itemsAvailable
                        }%`,
                      }}
                    >
                      <div className="progressbar-liquid"></div>
                    </div>
                    <span className="progress">
                      TOTAL MINTED : {itemsRedeemed} / {itemsAvailable}
                    </span>
                  </div>
                </div>
              )}
            </Menu>
            <Wallet>
              {wallet ? (
                <WalletAmount>
                  {(balance || 0).toLocaleString()} SOL
                  <ConnectButton />
                </WalletAmount>
              ) : (
                <ConnectButton>Connect Wallet</ConnectButton>
              )}
            </Wallet>
          </WalletContainer>
        </Logo>
        {wallet && <div className="overlay"></div>}
        {wallet && (
          <MintContainer>
            <DesContainer>
              <Snackbar
                open={alertState.open}
                autoHideDuration={101000}
                onClose={() => setAlertState({ ...alertState, open: false })}
              >
                <div className="alertdiv">
                  <div className="alertmsg">
                    <div className="alerttext">
                      {" "}
                      {alertState.message} <br />{" "}
                      <div className="lnk">
                        {wallet && isActive && solanaExplorerLink && (
                          <SolExplorerLink
                            href={solanaExplorerLink}
                            target="_blank"
                          >
                            View on Solscan
                          </SolExplorerLink>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Snackbar>
              <NFT elevation={3}>
                <h2>
                  Total Minted {itemsRedeemed} / {itemsAvailable}
                </h2>
                {wallet &&
                  isActive &&
                  whitelistEnabled &&
                  whitelistTokenBalance > 0 && (
                    <h3>
                      This Wallet is alloted {whitelistTokenBalance} Mint{" "}
                      {whitelistTokenBalance > 1 ? "Tokens" : "Token"}.
                    </h3>
                  )}
                <br />
                <div>
                  <Price
                    label={
                      isActive && whitelistEnabled && whitelistTokenBalance > 0
                        ? "WhiteList Mint Price :" +
                          whitelistPrice +
                          " " +
                          priceLabel
                        : "Mint Price :" + price + " " + priceLabel
                    }
                  />
                </div>

                {/* <div><Price
                                label={isActive && whitelistEnabled && (whitelistTokenBalance > 0) ? (whitelistPrice + " " + priceLabel) : (price + " " + priceLabel)}/><Image
                                src="cool-cats.gif"
                                alt="NFT To Mint"/></div> */}

                {wallet &&
                  isActive &&
                  whitelistEnabled &&
                  whitelistTokenBalance > 0 &&
                  isBurnToken &&
                  " "}
                {wallet &&
                  isActive &&
                  whitelistEnabled &&
                  whitelistTokenBalance > 0 &&
                  !isBurnToken && (
                    <h3>You are whitelisted and allowed to mint.</h3>
                  )}
                {wallet &&
                  isActive &&
                  endDate &&
                  Date.now() < endDate.getTime() && (
                    <Countdown
                      date={toDate(candyMachine?.state?.endSettings?.number)}
                      onMount={({ completed }) => completed && setIsEnded(true)}
                      onComplete={() => {
                        setIsEnded(true);
                      }}
                      renderer={renderEndDateCounter}
                    />
                  )}
                <br />
                <MintButtonContainer>
                  {!isActive &&
                  !isEnded &&
                  candyMachine?.state.goLiveDate &&
                  (!isWLOnly || whitelistTokenBalance > 0) ? (
                    <Countdown
                      date={toDate(candyMachine?.state.goLiveDate)}
                      onMount={({ completed }) =>
                        completed && setIsActive(!isEnded)
                      }
                      onComplete={() => {
                        setIsActive(!isEnded);
                      }}
                      renderer={renderGoLiveDateCounter}
                    />
                  ) : !wallet ? (
                    <ConnectButton>Connect Wallet</ConnectButton>
                  ) : !isWLOnly || whitelistTokenBalance > 0 ? (
                    candyMachine?.state.gatekeeper &&
                    wallet.publicKey &&
                    wallet.signTransaction ? (
                      <GatewayProvider
                        wallet={{
                          publicKey:
                            wallet.publicKey ||
                            new PublicKey(CANDY_MACHINE_PROGRAM),
                          //@ts-ignore
                          signTransaction: wallet.signTransaction,
                        }}
                        // // Replace with following when added
                        // gatekeeperNetwork={candyMachine.state.gatekeeper_network}
                        gatekeeperNetwork={
                          candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                        } // This is the ignite (captcha) network
                        /// Don't need this for mainnet
                        clusterUrl={rpcUrl}
                        options={{ autoShowModal: false }}
                      ></GatewayProvider>
                    ) : (
                      <MintButton
                        candyMachine={candyMachine}
                        isMinting={isMinting}
                        isActive={isActive}
                        isEnded={isEnded}
                        isSoldOut={isSoldOut}
                        onMint={startMint}
                      />
                    )
                  ) : (
                    <h1>Mint is private.</h1>
                  )}
                </MintButtonContainer>
                <p>
                  {wallet &&
                    shortenAddress(wallet.publicKey.toBase58() || " ") + " "}
                  ||
                  {" Bal:- " + (balance || 0).toLocaleString()} SOL
                </p>
                <br />
                {wallet && isActive && solanaExplorerLink && (
                  <SolExplorerLink href={solanaExplorerLink} target="_blank">
                    View on Solscan
                  </SolExplorerLink>
                )}
              </NFT>
            </DesContainer>
          </MintContainer>
        )}
        ;
      </MainContainer>
    </main>
  );
};

export default Home;
