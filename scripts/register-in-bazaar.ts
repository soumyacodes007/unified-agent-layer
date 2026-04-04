/**
 * Register HyperLocal Weather Agent in the GoPlausible Bazaar
 * 
 * This script:
 * 1. Hits /v1/weather to get the 402 Payment Required (with Bazaar discovery data)
 * 2. Uses mnemonic to sign an Algorand Testnet payment
 * 3. Settles with the GoPlausible facilitator
 * 4. Checks the Bazaar to verify registration
 */

import algosdk from 'algosdk';
import { wrapFetchWithPayment, x402Client } from '@x402-avm/fetch';
import { registerExactAvmScheme } from '@x402-avm/avm/exact/client';

const MNEMONIC = 'visa inject squirrel minute draft client stem coyote diamond one side reunion smoke tunnel island craft bacon join pond quantum afraid affair shrug able mechanic';
const FACILITATOR_URL = 'https://facilitator.goplausible.xyz';
const WEATHER_URL = 'http://localhost:4030/v1/weather?city=Mumbai&units=metric';

async function main() {
  console.log('\n🌤️  HyperLocal Weather Agent — Bazaar Registration\n');

  // 1. Derive account from mnemonic
  const account = algosdk.mnemonicToSecretKey(MNEMONIC);
  const address = account.addr.toString();
  console.log(`🔑 Wallet: ${address}`);

  // 2. Check ALGO balance first
  const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
  try {
    const info = await algodClient.accountInformation(address).do();
    const algoBalance = Number(info.amount) / 1_000_000;
    console.log(`💰 Balance: ${algoBalance.toFixed(6)} ALGO\n`);
    if (algoBalance < 0.1) {
      console.error('❌ Insufficient ALGO! Get testnet ALGO from: https://bank.testnet.algorand.network/');
      process.exit(1);
    }
  } catch (e) {
    console.warn('⚠️  Could not check balance — proceeding anyway...\n');
  }

  // 3. Build x402 client with mnemonic signer
  const secretKey = account.sk;
  const signer = {
    address,
    signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
      return txns.map((txnBytes, i) => {
        if (indexesToSign && !indexesToSign.includes(i)) return null;
        const decoded = algosdk.decodeUnsignedTransaction(txnBytes);
        const signed = algosdk.signTransaction(decoded, secretKey);
        return signed.blob;
      });
    },
  };

  const client = new x402Client();
  registerExactAvmScheme(client, {
    signer,
    algodConfig: { algodUrl: 'https://testnet-api.algonode.cloud' },
  });

  // Log payment details before signing
  client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
    const amount = Number(selectedRequirements.amount ?? 0) / 1_000_000;
    console.log(`💳 Paying $${amount.toFixed(6)} USDC to ${selectedRequirements.payTo}`);
    console.log(`   Network: ${selectedRequirements.network}`);
    return undefined;
  });

  client.onAfterPaymentCreation(async () => {
    console.log('✅ Payment transaction signed!\n');
  });

  const fetchWithPay = wrapFetchWithPayment(fetch, client);

  // 4. Make x402 payment to the weather API
  console.log(`📡 Calling: ${WEATHER_URL}`);
  console.log('   (This will auto-pay, settle with GoPlausible, and register in Bazaar)\n');
  
  try {
    const response = await fetchWithPay(WEATHER_URL);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ Error ${response.status}: ${text}`);
      process.exit(1);
    }

    const weather = await response.json() as any;
    
    console.log('🌤️  Weather Response:');
    console.log(`   City: ${weather.city}`);
    console.log(`   Temp: ${weather.current.temperature}${weather.current.units.temp}`);
    console.log(`   Condition: ${weather.current.condition}`);
    console.log(`   Humidity: ${weather.current.humidity}%`);
    console.log(`   Wind: ${weather.current.windSpeed} ${weather.current.units.wind}`);
    
    // 5. Check payment response header
    const paymentResponse = response.headers.get('PAYMENT-RESPONSE');
    if (paymentResponse) {
      console.log(`\n📜 Payment settled! PAYMENT-RESPONSE header received.`);
    }

  } catch (error: any) {
    console.error('❌ Payment failed:', error.message ?? error);
    process.exit(1);
  }

  // 6. Query Bazaar to verify registration
  console.log('\n🔍 Querying GoPlausible Bazaar...\n');
  await new Promise(r => setTimeout(r, 2000)); // give facilitator time to catalog

  try {
    const bazaarRes = await fetch(`${FACILITATOR_URL}/discovery/resources?limit=100`);
    const bazaar = await bazaarRes.json() as any;
    
    console.log(`📦 Bazaar Total Items: ${bazaar.pagination?.total ?? 0}`);
    
    if (bazaar.items && bazaar.items.length > 0) {
      console.log('\n✅ Registered Services:');
      for (const item of bazaar.items) {
        console.log(`   → ${item.resource}`);
        if (item.metadata?.description) console.log(`     ${item.metadata.description}`);
      }
    } else {
      console.log('\n⏳ Not yet visible in Bazaar (facilitator may take a moment to index).');
      console.log('   Run this to check: curl https://facilitator.goplausible.xyz/discovery/resources');
    }
  } catch (err) {
    console.error('⚠️  Could not query Bazaar:', err);
  }

  console.log('\n🎉 Done! Your HyperLocal Weather Agent is live on x402-avm.\n');
}

main().catch(console.error);
