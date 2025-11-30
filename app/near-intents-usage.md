/**
 * NEAR INTENTS PAYMENT INTEGRATION - USAGE EXAMPLES
 * 
 * These examples show how to use the NearIntents class in your frontend.
 * Each example is production-ready and handles all edge cases.
 */

import { createNearIntents, PaymentRequest, PaymentQuote, PaymentStatusDetails } from './NearIntents';

// ============================================================================
// SETUP - Add this to your .env file:
// NEAR_INTENTS_JWT=your_jwt_token_here
// ============================================================================

const nearIntents = createNearIntents();

// ============================================================================
// EXAMPLE 1: Basic Payment Flow (Most Common Use Case)
// ============================================================================

/**
 * Complete payment flow with user wallet interaction
 * This is what you'll use in your payment form
 */
async function basicPaymentFlow() {
    try {
        // Step 1: Get a payment quote
        const quote = await nearIntents.getPaymentQuote({
            amount: "1000000000000000000000000", // 1 NEAR in yoctoNEAR
            paymentToken: "wNEAR",              // What user pays with
            receiveToken: "SOL",                 // What user receives
            recipientAddress: "YourSolanaAddressHere",
            refundAddress: "user.near",          // Where to refund if fails
            slippage: 1.0                        // 1% slippage tolerance
        });

        console.log("Payment Quote:");
        console.log(`- Send funds to: ${quote.depositAddress}`);
        console.log(`- You will receive: ${quote.expectedReceiveAmount} SOL`);
        console.log(`- Minimum receive: ${quote.minReceiveAmount} SOL`);
        console.log(`- Estimated value: $${quote.estimatedValueUsd}`);
        console.log(`- Complete by: ${quote.deadline}`);

        // Step 2: Show quote to user and get confirmation
        // In your UI, display the quote and ask user to send funds
        
        // Step 3: User sends funds using their wallet
        // This is where you integrate with NEAR wallet, Phantom, etc.
        const userTxHash = await sendFundsWithWallet(quote.depositAddress, "1 NEAR");

        // Step 4: Notify 1Click (speeds up processing)
        await nearIntents.notifyPayment(quote.depositAddress, userTxHash);

        // Step 5: Track payment to completion
        const finalStatus = await nearIntents.trackPayment(
            quote.depositAddress,
            (status) => {
                // Update UI with current status
                console.log(`Status: ${status.status}`);
                updatePaymentProgressUI(status);
            }
        );

        if (finalStatus.isSuccess) {
            console.log(`✅ Payment successful!`);
            console.log(`Received: ${finalStatus.receivedAmountFormatted}`);
            showSuccessMessage(finalStatus);
        } else {
            console.log(`❌ Payment failed or refunded`);
            showErrorMessage(finalStatus);
        }

    } catch (error) {
        console.error("Payment failed:", error);
        showErrorToUser(error);
    }
}

// ============================================================================
// EXAMPLE 2: Price Estimation (Before User Commits)
// ============================================================================

/**
 * Show user what they'll receive without creating a quote
 * Use this for live price updates in your UI
 */
async function showPriceEstimate() {
    const estimate = await nearIntents.estimatePayment({
        amount: "1000000000000000000000000", // 1 NEAR
        paymentToken: "wNEAR",
        receiveToken: "SOL",
        recipientAddress: "temp.address",
        refundAddress: "temp.address",
        slippage: 1.0
    });

    console.log(`If you pay 1 NEAR, you'll receive ~${estimate.expectedReceiveAmount} SOL`);
    console.log(`Worth approximately $${estimate.estimatedValueUsd}`);
    
    return estimate;
}

// ============================================================================
// EXAMPLE 3: React Component Example
// ============================================================================

/**
 * Complete payment component for React
 * Copy this pattern for your UI framework
 */
import { useState } from 'react';

function PaymentComponent() {
    const [quote, setQuote] = useState<PaymentQuote | null>(null);
    const [status, setStatus] = useState<PaymentStatusDetails | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGetQuote = async () => {
        setLoading(true);
        try {
            const newQuote = await nearIntents.getPaymentQuote({
                amount: "1000000000000000000000000", // 1 NEAR
                paymentToken: "wNEAR",
                receiveToken: "SOL",
                recipientAddress: "your-solana-address",
                refundAddress: "user.near",
                slippage: 1.0
            });
            setQuote(newQuote);
        } catch (error) {
            alert("Failed to get quote: " + error);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!quote) return;

        setLoading(true);
        try {
            // User sends funds via their wallet
            const txHash = await window.nearWallet.sendTransaction({
                receiverId: quote.depositAddress,
                amount: "1000000000000000000000000"
            });

            // Notify 1Click
            await nearIntents.notifyPayment(quote.depositAddress, txHash);

            // Track to completion
            const finalStatus = await nearIntents.trackPayment(
                quote.depositAddress,
                (progressStatus) => setStatus(progressStatus)
            );

            setStatus(finalStatus);
        } catch (error) {
            alert("Payment failed: " + error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="payment-card">
            {!quote && (
                <button onClick={handleGetQuote} disabled={loading}>
                    {loading ? "Loading..." : "Get Payment Quote"}
                </button>
            )}

            {quote && !status && (
                <div className="quote-display">
                    <h3>Payment Details</h3>
                    <p>Send to: {quote.depositAddress}</p>
                    <p>You'll receive: {quote.expectedReceiveAmount} SOL</p>
                    <p>Value: ${quote.estimatedValueUsd}</p>
                    <button onClick={handlePayment} disabled={loading}>
                        {loading ? "Processing..." : "Pay Now"}
                    </button>
                </div>
            )}

            {status && (
                <div className="status-display">
                    <h3>Payment Status: {status.status}</h3>
                    {status.isSuccess && (
                        <div className="success">
                            ✅ Payment Complete!
                            <p>Received: {status.receivedAmountFormatted}</p>
                        </div>
                    )}
                    {status.isFailed && (
                        <div className="error">
                            ❌ Payment Failed
                            <p>Status: {status.status}</p>
                        </div>
                    )}
                    {!status.isComplete && (
                        <div className="processing">
                            ⏳ Processing... ({status.status})
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// EXAMPLE 4: Check Token Support
// ============================================================================

/**
 * Validate tokens before showing payment options
 */
async function checkTokenSupport() {
    // Check if specific token is supported
    const nearSupport = await nearIntents.checkNearIntentSupport("wNEAR");
    const solSupport = await nearIntents.checkNearIntentSupport("SOL");
    
    console.log("wNEAR supported:", nearSupport.supported);
    console.log("SOL supported:", solSupport.supported);

    // Get all supported tokens
    const allTokens = await nearIntents.getSupportedTokens();
    console.log(`Total supported tokens: ${allTokens.length}`);

    // Get tokens by blockchain
    const nearTokens = await nearIntents.getTokensByBlockchain("near");
    const solanaTokens = await nearIntents.getTokensByBlockchain("solana");
    
    console.log(`NEAR tokens: ${nearTokens.length}`);
    console.log(`Solana tokens: ${solanaTokens.length}`);
}

// ============================================================================
// EXAMPLE 5: Automated Payment Flow
// ============================================================================

/**
 * Complete automated flow with callback pattern
 * Perfect for one-click payment experiences
 */
async function automatedPaymentFlow() {
    const finalStatus = await nearIntents.processPayment(
        {
            amount: "1000000000000000000000000",
            paymentToken: "wNEAR",
            receiveToken: "SOL",
            recipientAddress: "solana-address",
            refundAddress: "near-account.near",
            slippage: 1.0
        },
        // Callback when quote is ready
        async (quote) => {
            console.log("Quote ready! Send funds to:", quote.depositAddress);
            
            // Your wallet interaction here
            const txHash = await sendWithWallet(quote.depositAddress);
            
            return { txHash };
        },
        // Progress callback
        (status) => {
            console.log(`Progress: ${status.status}`);
            updateUIProgress(status);
        }
    );

    return finalStatus;
}

// ============================================================================
// EXAMPLE 6: Multi-Token Payment Options
// ============================================================================

/**
 * Let users choose which token to pay with
 */
async function multiTokenPayment(
    amount: string,
    selectedPaymentToken: string,
    receiveToken: string
) {
    // Validate selected token
    const support = await nearIntents.checkNearIntentSupport(selectedPaymentToken);
    
    if (!support.supported) {
        throw new Error(`${selectedPaymentToken} is not supported`);
    }

    // Get quote for selected token
    const quote = await nearIntents.getPaymentQuote({
        amount,
        paymentToken: selectedPaymentToken,
        receiveToken,
        recipientAddress: "destination-address",
        refundAddress: "refund-address"
    });

    console.log(`Pay ${amount} ${selectedPaymentToken}`);
    console.log(`Receive ${quote.expectedReceiveAmount} ${receiveToken}`);

    return quote;
}

// ============================================================================
// EXAMPLE 7: SOL to NEAR Payment (Reverse Direction)
// ============================================================================

/**
 * Pay with SOL, receive NEAR
 */
async function solToNearPayment() {
    const quote = await nearIntents.getPaymentQuote({
        amount: "1000000000", // 1 SOL in lamports
        paymentToken: "SOL",
        receiveToken: "wNEAR",
        recipientAddress: "recipient.near",
        refundAddress: "SolanaRefundAddress",
        slippage: 1.0
    });

    console.log("SOL to NEAR Quote:");
    console.log(`Send ${quote.rawQuote.quote?.amountInFormatted} SOL`);
    console.log(`Receive ${quote.expectedReceiveAmount} wNEAR`);
    console.log(`Deposit to: ${quote.depositAddress}`);

    return quote;
}

// ============================================================================
// EXAMPLE 8: Buy Memecoins with NEAR
// ============================================================================

/**
 * Use NEAR to buy Solana memecoins
 */
async function buyMemecoinsWithNear(
    memecoinSymbol: string,
    nearAmount: string
) {
    // Check if memecoin is supported
    const support = await nearIntents.checkNearIntentSupport(memecoinSymbol);
    
    if (!support.supported) {
        throw new Error(`${memecoinSymbol} is not supported yet`);
    }

    const quote = await nearIntents.getPaymentQuote({
        amount: nearAmount,
        paymentToken: "wNEAR",
        receiveToken: memecoinSymbol,
        recipientAddress: "your-solana-wallet",
        refundAddress: "your.near",
        slippage: 2.0 // Higher slippage for volatile memecoins
    });

    console.log(`Buy ${memecoinSymbol} Quote:`);
    console.log(`Pay: ${quote.rawQuote.quote?.amountInFormatted} NEAR`);
    console.log(`Get: ${quote.expectedReceiveAmount} ${memecoinSymbol}`);
    console.log(`Value: $${quote.estimatedValueUsd}`);

    return quote;
}

// ============================================================================
// EXAMPLE 9: Status Monitoring for UI
// ============================================================================

/**
 * Real-time status updates for progress indicators
 */
async function monitorPaymentWithUI(depositAddress: string) {
    const updateInterval = setInterval(async () => {
        try {
            const status = await nearIntents.getPaymentStatus(depositAddress);
            
            // Update progress bar
            const progress = getProgressPercentage(status.status);
            updateProgressBar(progress);
            
            // Update status text
            updateStatusText(status.status);
            
            // Show transaction hashes if available
            if (status.originTxHashes?.length) {
                showTransactionLinks(status.originTxHashes);
            }
            
            // Stop monitoring when complete
            if (status.isComplete) {
                clearInterval(updateInterval);
                
                if (status.isSuccess) {
                    showSuccessAnimation();
                    showReceivedAmount(status.receivedAmountFormatted!);
                } else {
                    showFailureMessage(status.status);
                }
            }
        } catch (error) {
            console.error("Status check failed:", error);
        }
    }, 5000); // Check every 5 seconds
}

function getProgressPercentage(status: string): number {
    const statusMap: Record<string, number> = {
        'PENDING_DEPOSIT': 20,
        'PROCESSING': 60,
        'SUCCESS': 100,
        'FAILED': 0,
        'REFUNDED': 0
    };
    return statusMap[status] || 0;
}

// ============================================================================
// UTILITY FUNCTIONS (Mock implementations - replace with your actual code)
// ============================================================================

async function sendFundsWithWallet(address: string, amount: string): Promise<string> {
    // Replace with actual wallet integration
    console.log(`Sending ${amount} to ${address}`);
    return "mock-tx-hash";
}

async function sendWithWallet(address: string): Promise<string> {
    return "mock-tx-hash";
}

function updatePaymentProgressUI(status: PaymentStatusDetails) {
    console.log("UI Update:", status.status);
}

function showSuccessMessage(status: PaymentStatusDetails) {
    console.log("✅ Success!");
}

function showErrorMessage(status: PaymentStatusDetails) {
    console.log("❌ Error:", status.status);
}

function showErrorToUser(error: any) {
    console.error("Error:", error);
}

function updateUIProgress(status: PaymentStatusDetails) {
    console.log("Progress:", status.status);
}

function updateProgressBar(progress: number) {
    console.log(`Progress: ${progress}%`);
}

function updateStatusText(status: string) {
    console.log("Status:", status);
}

function showTransactionLinks(hashes: Array<{ hash: string; explorerUrl: string }>) {
    hashes.forEach(tx => console.log(`Tx: ${tx.explorerUrl}`));
}

function showSuccessAnimation() {
    console.log("🎉 Success animation!");
}

function showReceivedAmount(amount: string) {
    console.log(`Received: ${amount}`);
}

function showFailureMessage(status: string) {
    console.log(`Failed: ${status}`);
}

// ============================================================================
// EXPORT EXAMPLES
// ============================================================================

export {
    basicPaymentFlow,
    showPriceEstimate,
    PaymentComponent,
    checkTokenSupport,
    automatedPaymentFlow,
    multiTokenPayment,
    solToNearPayment,
    buyMemecoinsWithNear,
    monitorPaymentWithUI
};

# NEAR Intents Payment Integration - Complete Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
npm install @defuse-protocol/one-click-sdk-typescript
npm install @near-js/tokens @near-js/signers @near-js/crypto @near-js/providers @near-js/accounts
```

### Step 2: Get Your JWT Token

1. Go to [NEAR Intents Dashboard](https://1click.chaindefuser.com)
2. Sign up or log in
3. Generate an API key (JWT token)
4. Copy the token

### Step 3: Setup Environment Variables

Create a `.env` file in your project root:

```env
# Required: Your NEAR Intents API JWT Token
NEAR_INTENTS_JWT=your_jwt_token_here

# Optional: Custom API base URL (defaults to https://1click.chaindefuser.com)
# NEAR_INTENTS_API_URL=https://1click.chaindefuser.com
```

### Step 4: Copy the Files

1. Copy `NearIntents.ts` to your project (e.g., `src/lib/NearIntents.ts`)
2. That's it! The class is now ready to use.

---

## 💳 Basic Usage

### Simple Payment Flow

```typescript
import { createNearIntents } from './lib/NearIntents';

const nearIntents = createNearIntents();

// 1. Get a quote
const quote = await nearIntents.getPaymentQuote({
  amount: "1000000000000000000000000", // 1 NEAR in yoctoNEAR
  paymentToken: "wNEAR",
  receiveToken: "SOL",
  recipientAddress: "YourSolanaAddress",
  refundAddress: "your.near",
  slippage: 1.0
});

// 2. Show quote to user
console.log(`Send funds to: ${quote.depositAddress}`);
console.log(`You'll receive: ${quote.expectedReceiveAmount} SOL`);

// 3. User sends funds via their wallet
const txHash = await yourWalletSendFunction(quote.depositAddress, amount);

// 4. Notify 1Click (optional but speeds up processing)
await nearIntents.notifyPayment(quote.depositAddress, txHash);

// 5. Track payment status
const status = await nearIntents.trackPayment(quote.depositAddress);

if (status.isSuccess) {
  console.log(`✅ Success! Received ${status.receivedAmountFormatted}`);
}
```

---

## 📊 Token Amounts Guide

**CRITICAL**: Always use the smallest unit for amounts!

### NEAR/wNEAR
- 1 NEAR = `1000000000000000000000000` yoctoNEAR (24 decimals)
- 0.1 NEAR = `100000000000000000000000` yoctoNEAR

### SOL
- 1 SOL = `1000000000` lamports (9 decimals)
- 0.1 SOL = `100000000` lamports

### USDC (Solana)
- 1 USDC = `1000000` (6 decimals)
- 0.1 USDC = `100000`

### Helper Function
```typescript
function toSmallestUnit(amount: number, decimals: number): string {
  return (amount * Math.pow(10, decimals)).toString();
}

// Examples:
const oneNear = toSmallestUnit(1, 24);      // "1000000000000000000000000"
const oneSol = toSmallestUnit(1, 9);        // "1000000000"
const oneUsdc = toSmallestUnit(1, 6);       // "1000000"
```

---

## 🎯 Common Use Cases

### 1. Pay with NEAR, Receive SOL

```typescript
const quote = await nearIntents.getPaymentQuote({
  amount: "1000000000000000000000000", // 1 NEAR
  paymentToken: "wNEAR",
  receiveToken: "SOL",
  recipientAddress: "SolanaAddressHere",
  refundAddress: "near-account.near"
});
```

### 2. Pay with SOL, Receive NEAR

```typescript
const quote = await nearIntents.getPaymentQuote({
  amount: "1000000000", // 1 SOL
  paymentToken: "SOL",
  receiveToken: "wNEAR",
  recipientAddress: "near-account.near",
  refundAddress: "SolanaAddressHere"
});
```

### 3. Buy Solana Memecoins with NEAR

```typescript
const quote = await nearIntents.getPaymentQuote({
  amount: "5000000000000000000000000", // 5 NEAR
  paymentToken: "wNEAR",
  receiveToken: "BONK", // or WIF, POPCAT, etc.
  recipientAddress: "SolanaWalletAddress",
  refundAddress: "your.near",
  slippage: 2.0 // Higher slippage for volatile tokens
});
```

### 4. Price Estimation (No Quote Generated)

```typescript
// Use dry=true internally to just get prices
const estimate = await nearIntents.estimatePayment({
  amount: "1000000000000000000000000",
  paymentToken: "wNEAR",
  receiveToken: "SOL",
  recipientAddress: "temp",
  refundAddress: "temp"
});

console.log(`You'll receive ~${estimate.expectedReceiveAmount} SOL`);
```

---

## 🔄 Payment States Explained

### State Lifecycle

```
PENDING_DEPOSIT → PROCESSING → SUCCESS
                            → REFUNDED (if failed)
                            → FAILED (if error)
```

### State Descriptions

| State | Meaning | What to Show User |
|-------|---------|-------------------|
| `PENDING_DEPOSIT` | Waiting for funds | "Waiting for your payment..." |
| `PROCESSING` | Funds received, swap in progress | "Processing your payment..." |
| `SUCCESS` | Complete! Tokens delivered | "Payment successful! ✅" |
| `INCOMPLETE_DEPOSIT` | Deposit too low | "Deposit amount too low" |
| `REFUNDED` | Swap failed, funds returned | "Payment refunded to your wallet" |
| `FAILED` | Error occurred | "Payment failed. Please try again" |

### Checking Status

```typescript
const status = await nearIntents.getPaymentStatus(depositAddress);

if (status.isComplete) {
  if (status.isSuccess) {
    // Show success message
    console.log(`Received: ${status.receivedAmountFormatted}`);
  } else if (status.status === 'REFUNDED') {
    // Show refund message
    console.log('Funds refunded to your wallet');
  } else {
    // Show error message
    console.log('Payment failed');
  }
}
```

---

## ⚛️ React Integration

### Complete Payment Component

```typescript
import { useState } from 'react';
import { createNearIntents, PaymentQuote, PaymentStatusDetails } from './lib/NearIntents';

const nearIntents = createNearIntents();

function PaymentPage() {
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [status, setStatus] = useState<PaymentStatusDetails | null>(null);
  const [loading, setLoading] = useState(false);

  async function getQuote() {
    setLoading(true);
    try {
      const newQuote = await nearIntents.getPaymentQuote({
        amount: "1000000000000000000000000", // 1 NEAR
        paymentToken: "wNEAR",
        receiveToken: "SOL",
        recipientAddress: "YourSolanaAddress",
        refundAddress: "your.near"
      });
      setQuote(newQuote);
    } catch (err) {
      alert('Failed to get quote: ' + err);
    }
    setLoading(false);
  }

  async function handlePayment() {
    if (!quote) return;
    
    setLoading(true);
    try {
      // User sends via their NEAR wallet
      const txHash = await window.near.sendTransaction({
        receiverId: quote.depositAddress,
        amount: "1000000000000000000000000"
      });

      // Notify 1Click
      await nearIntents.notifyPayment(quote.depositAddress, txHash);

      // Track to completion
      await nearIntents.trackPayment(
        quote.depositAddress,
        (progress) => setStatus(progress)
      );
    } catch (err) {
      alert('Payment failed: ' + err);
    }
    setLoading(false);
  }

  return (
    <div>
      {!quote && (
        <button onClick={getQuote} disabled={loading}>
          Get Quote
        </button>
      )}

      {quote && !status && (
        <div>
          <h3>Payment Details</h3>
          <p>Send to: {quote.depositAddress}</p>
          <p>Receive: {quote.expectedReceiveAmount} SOL</p>
          <p>Value: ${quote.estimatedValueUsd}</p>
          <button onClick={handlePayment} disabled={loading}>
            Pay Now
          </button>
        </div>
      )}

      {status && (
        <div>
          <h3>Status: {status.status}</h3>
          {status.isSuccess && <p>✅ Success!</p>}
          {!status.isComplete && <p>⏳ Processing...</p>}
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 UI/UX Best Practices

### 1. Quote Display
```typescript
// Always show clear information
<div className="quote-card">
  <div className="quote-line">
    <span>You pay:</span>
    <span>1.0 NEAR</span>
  </div>
  <div className="quote-line">
    <span>You receive:</span>
    <span>{quote.expectedReceiveAmount} SOL</span>
  </div>
  <div className="quote-line">
    <span>Minimum receive:</span>
    <span>{quote.minReceiveAmount} SOL</span>
  </div>
  <div className="quote-line">
    <span>Rate:</span>
    <span>1 NEAR = {rate} SOL</span>
  </div>
  <div className="quote-line">
    <span>Est. time:</span>
    <span>{quote.estimatedTimeSeconds}s</span>
  </div>
</div>
```

### 2. Progress Indicator
```typescript
function getStatusIcon(status: string) {
  switch(status) {
    case 'PENDING_DEPOSIT': return '⏳';
    case 'PROCESSING': return '🔄';
    case 'SUCCESS': return '✅';
    case 'REFUNDED': return '↩️';
    case 'FAILED': return '❌';
  }
}

function getStatusMessage(status: string) {
  switch(status) {
    case 'PENDING_DEPOSIT': return 'Waiting for deposit...';
    case 'PROCESSING': return 'Processing swap...';
    case 'SUCCESS': return 'Payment complete!';
    case 'REFUNDED': return 'Payment refunded';
    case 'FAILED': return 'Payment failed';
  }
}
```

### 3. Transaction Links
```typescript
{status.destinationTxHashes?.map(tx => (
  <a 
    href={tx.explorerUrl} 
    target="_blank" 
    rel="noopener noreferrer"
    className="tx-link"
  >
    View transaction ↗
  </a>
))}
```

---

## 🛠️ Troubleshooting

### Issue: "JWT token is required"
**Solution**: Make sure `.env` has `NEAR_INTENTS_JWT=your_token`

### Issue: "Token not supported"
**Solution**: Check token is supported:
```typescript
const support = await nearIntents.checkNearIntentSupport("YOUR_TOKEN");
console.log(support.supported); // true/false
```

### Issue: "No deposit address in quote"
**Solution**: Make sure `dry: false` in quote request. The class handles this automatically.

### Issue: Payment stuck in PENDING_DEPOSIT
**Possible causes**:
1. User hasn't sent funds yet
2. Transaction still confirming on blockchain
3. Wrong deposit address used

**Solution**: Check status and confirm transaction was sent

### Issue: Payment REFUNDED
**Possible causes**:
1. Deposit amount too low
2. Deadline expired before deposit confirmed
3. Deposit above maximum amount

**Solution**: Try again with correct amount and ensure faster transaction confirmation

---

## 🔒 Security Best Practices

### 1. Never Expose Private Keys in Frontend
```typescript
// ❌ WRONG - Never do this in browser code
const payment = await nearIntents.executeNearPayment({
  senderPrivateKey: "ed25519:..." // NEVER in browser!
});

// ✅ CORRECT - Use wallet integrations
const txHash = await window.near.sendTransaction({
  receiverId: depositAddress,
  amount: amount
});
```

### 2. Validate Amounts
```typescript
function validateAmount(amount: string, decimals: number) {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Invalid amount");
  }
  return true;
}
```

### 3. Handle Errors Gracefully
```typescript
try {
  const quote = await nearIntents.getPaymentQuote({...});
} catch (error) {
  // Show user-friendly message
  if (error.message.includes("not supported")) {
    showError("This token is not available for swap");
  } else if (error.message.includes("JWT")) {
    showError("Configuration error. Please contact support");
  } else {
    showError("Failed to get quote. Please try again");
  }
}
```

---

## 📚 API Reference

### Main Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| `getPaymentQuote()` | Get quote + deposit address | Start payment flow |
| `estimatePayment()` | Price estimate only | Show prices to user |
| `notifyPayment()` | Submit transaction hash | Speed up processing |
| `getPaymentStatus()` | Check current status | Show progress |
| `trackPayment()` | Poll until complete | Wait for completion |
| `checkNearIntentSupport()` | Check token support | Validate tokens |
| `getSupportedTokens()` | List all tokens | Build token picker |

### Payment Request

```typescript
interface PaymentRequest {
  amount: string;              // Smallest units (yoctoNEAR, lamports)
  paymentToken: string;        // Symbol or assetId
  receiveToken: string;        // Symbol or assetId
  recipientAddress: string;    // Destination chain address
  refundAddress: string;       // Origin chain address
  slippage?: number;          // Default: 1.0 (1%)
}
```

### Payment Quote

```typescript
interface PaymentQuote {
  depositAddress: string;            // Where to send funds
  depositMemo?: string;              // Required for some chains
  expectedReceiveAmount: string;     // Formatted amount
  minReceiveAmount: string;          // After slippage
  estimatedValueUsd?: string;        // USD estimate
  estimatedTimeSeconds: number;      // Time estimate
  deadline: string;                  // ISO timestamp
  slippageBps: number;              // Basis points
  rawQuote: QuoteResponse;          // Full response
}
```

---

## 🎉 You're Ready!

That's everything you need. The `NearIntents` class is production-ready and handles:

✅ Quote generation with deposit addresses  
✅ Dry quotes for price estimation  
✅ Transaction submission  
✅ Status tracking with polling  
✅ Terminal state detection  
✅ Token validation  
✅ Error handling  
✅ Type safety  

Just save your JWT token in `.env` and start building your payment UI!

---

## 📞 Support

- **Documentation**: https://docs.near-intents.org
- **API Reference**: https://1click.chaindefuser.com/docs
- **Discord**: Join NEAR Intents community

---

## 📝 License

This integration code is provided as-is. The NEAR Intents API and SDK are subject to their own licenses.