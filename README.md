# 📦 BlockBin — Decentralized File Storage on IPFS + Blockchain

BlockBin is a Web3-enabled application that allows users to securely upload files to **IPFS** using **Web3.Storage** and permanently store their metadata (like file name, hash, type, size, timestamp) on the **Ethereum blockchain** using a smart contract.

---

## ✨ Features

- 🔐 Connect with your Web3 wallet (via [RainbowKit](https://www.rainbowkit.com/))
- 🪪 Login to Web3.Storage
- 📁 Upload files to IPFS
- ⛓️ Save file metadata on-chain
- 🔎 Fetch and display all files uploaded by your wallet
- ✅ Check file accessibility status in real time
- 📜 View IPFS CID and transaction hash with direct links

---

## 🏁 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/blockbin.git
cd blockbin
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Smart Contract
Update the contract.js file inside src/:
```bash
export const CONTRACT_ADDRESS = "your_contract_address_here";
export const CONTRACT_ABI = [/* your_contract_ABI_here */];
```
Make sure your smart contract includes:
- `uploadFile(string cid, uint256 size, string fileType, string fileName)`
- `fileCount() view returns (uint256)`
- `files(address, uint256) view returns (...)`

## 💡 How It Works:
### 🔗 Wallet Integration

- Uses **RainbowKit** + **wagmi** to connect Ethereum-compatible wallets.
- Uses `useWalletClient()` and `getContract()` to read/write to the blockchain.

### 🌐 IPFS via Web3.Storage

- Uses `@web3-storage/w3up-client` to interact with Web3.Storage.
- Logs in with a predefined email (`divijvermav8@gmail.com`) — change this to your own.

### ⛓️ Smart Contract Integration

- Uploads metadata to the smart contract after successful IPFS upload.
- Displays the blockchain transaction hash with a link to Etherscan.

### 📥 File Retrieval

- Fetches user-specific uploaded files from the smart contract.
- Verifies real-time accessibility of each file from IPFS (via `w3s.link`).

## Folder Structure
```bash
project/
├── public/
├── src/
│   ├── App.jsx           # logic and UI
│   ├── contract.js       # Contract address and ABI
│   └── ...
├── package.json
├── README.md
└── ...
```

## Development Scripts
```bash
npm run dev      # Start dev server
npm run build    # Create production build
```

## 🛠 Built With

- **React** + **Tailwind CSS**
- **RainbowKit** for wallet connection
- **wagmi** + **viem** for blockchain interactions
- **Web3.Storage** for IPFS-based decentralized file hosting
- **Ethereum** or **Polygon** smart contracts

---

## 📸 Screenshots

### Upload Interface

<!-- Optionally add an image here -->
<!-- ![Upload Interface](./screenshots/upload.png) -->

### Files List

<!-- Optionally add an image here -->
<!-- ![Files List](./screenshots/files.png) -->

---

## 🔐 Notes

- You must have a wallet (like MetaMask) installed.
- Ensure your wallet is connected and has funds for gas fees (use a testnet for development).
- Web3.Storage login uses email; update the hardcoded email for production use.
- For testnet deployment, configure RainbowKit to use Goerli, Sepolia, or Polygon Amoy.

## 👨‍💻 Author

**Divij Verma**  
🔗 [LinkedIn](https://www.linkedin.com/in/divij1524/)
