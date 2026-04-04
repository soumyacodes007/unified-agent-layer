/**
 * Debug script: Checks if the 402 response contains extensions.bazaar
 */

async function checkExtensions() {
  const resp = await fetch('http://localhost:4030/v1/weather?city=Mumbai&units=metric');
  
  if (resp.status !== 402) {
    console.log('❌ Expected 402, got:', resp.status);
    return;
  }

  const header = resp.headers.get('PAYMENT-REQUIRED');
  if (!header) {
    console.log('❌ No PAYMENT-REQUIRED header found');
    return;
  }

  const decoded = JSON.parse(Buffer.from(header, 'base64').toString());
  
  console.log('\n📦 Top-level keys:', Object.keys(decoded));
  console.log('   resource keys:', Object.keys(decoded.resource || {}));
  
  const reqs = decoded.paymentRequirements ?? [];
  console.log('   paymentRequirements count:', reqs.length);
  if (reqs[0]) console.log('   req[0] keys:', Object.keys(reqs[0]));

  const str = JSON.stringify(decoded);
  const hasBazaar = str.includes('"bazaar"');
  const hasExtensions = str.includes('"extensions"');
  
  console.log('\n🔍 Has "extensions":', hasExtensions);
  console.log('🔍 Has "bazaar":', hasBazaar);

  if (hasBazaar) {
    console.log('\n✅ SUCCESS! extensions.bazaar IS present in the 402 response!');
  } else {
    console.log('\n❌ extensions.bazaar NOT found. paymentMiddleware may not pass extensions through.');
    console.log('\n📄 Decoded 402 snippet:\n', JSON.stringify(decoded, null, 2).slice(0, 1000));
  }
}

checkExtensions().catch(console.error);
