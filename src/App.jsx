import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { create } from "@web3-storage/w3up-client";
import { useAccount, useWalletClient } from "wagmi";
import { getContract } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';

function App() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Create contract instance when needed
  const getContractInstance = () => {
    if (!walletClient) return null;
    
    return getContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      client: walletClient,
    });
  };

  const contract = getContractInstance();
  console.log("CONTRACT", contract);

  const [client, setClient] = useState(null);
  const [cid, setCid] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [initError, setInitError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // NEW FILE STATES
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [fileSize, setFileSize] = useState(null);
  const [fileType, setFileType] = useState(null);

  // BLOCKCHAIN TRANSACTION STATES
  const [txHash, setTxHash] = useState(null);
  const [uploadStage, setUploadStage] = useState(""); // "ipfs", "blockchain", "complete"

  // NEW STATES FOR GETTING FILES
  const [fileCount, setFileCount] = useState(0);
  const [isGettingFiles, setIsGettingFiles] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showFilesList, setShowFilesList] = useState(false);

  useEffect(() => {
    const setup = async () => {
      setIsInitializing(true);
      setInitError(null);

      try {
        console.log("Creating w3up client...");
        const w3upClient = await create();
        console.log("Client created, attempting login...");

        await w3upClient.login("divijvermav8@gmail.com");
        console.log("Login successful!");

        setClient(w3upClient);
      } catch (error) {
        console.error("Failed to setup w3up client:", error);
        setInitError(error.message);

        try {
          console.log("Trying alternative initialization...");
          const w3upClient = await create();
          setClient(w3upClient);
          setInitError("Client ready but login may be required for uploads");
        } catch (fallbackError) {
          console.error("Fallback initialization also failed:", fallbackError);
          setInitError("Failed to initialize Web3.Storage client.");
        }
      } finally {
        setIsInitializing(false);
      }
    };

    setup();
  }, []);

  const retryInitialization = () => {
    setClient(null);
    setInitError(null);
    window.location.reload();
  };

  // NEW FUNCTION TO GET FILES UPLOADED
  const getFilesUploaded = async () => {
    if (!contract || !address) {
      alert("Please connect your wallet first!");
      return;
    }

    setIsGettingFiles(true);
    try {
      // Get total file count
      const count = await contract.read.fileCount();
      const totalFiles = Number(count);
      setFileCount(totalFiles);
      console.log("Total files uploaded by contract:", totalFiles);

      // Get details of files uploaded by current user
      // The files mapping is: files[address][index] => FileInfo
      const files = [];
      let userFileIndex = 0;
      
      // We need to iterate through user's files until we find all of them
      // Since we don't know how many files the current user has uploaded,
      // we'll try to fetch files until we get an error or empty response
      while (true) {
        try {
          const fileInfo = await contract.read.files([address, BigInt(userFileIndex)]);
          
          // Check if we got a valid file (fileId > 0 means it exists)
          if (Number(fileInfo[0]) > 0) {
            files.push({
              id: Number(fileInfo[0]),           // fileId
              fileHash: fileInfo[1],             // fileHash
              fileSize: fileInfo[2],             // fileSize
              fileType: fileInfo[3],             // fileType
              fileName: fileInfo[4],             // fileName
              timestamp: fileInfo[5],            // uploadTime
              uploader: fileInfo[6]              // uploader
            });
            userFileIndex++;
          } else {
            // No more files for this user
            break;
          }
        } catch (error) {
          // No more files or error occurred
          console.log(`Finished fetching files at index ${userFileIndex}`);
          break;
        }
      }
      
      console.log(`Found ${files.length} files for current user`);
      setUploadedFiles(files);
      setShowFilesList(true);
      
      if (files.length === 0) {
        alert("No files found for your address. Upload some files first!");
      }
    } catch (err) {
      console.error("Error getting files:", err);
      alert(`Failed to get files: ${err.message}`);
    } finally {
      setIsGettingFiles(false);
    }
  };

  const handleFileUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*/*";

    input.onchange = async (e) => {
      const selectedFile = e.target.files[0];
      if (!selectedFile || !client) return;

      //wallet is connected and contract is available
      if (!address) {
        alert("Please connect your wallet first!");
        return;
      }

      if (!contract) {
        alert("Contract not available. Please make sure your wallet is connected.");
        return;
      }

      // Set file
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setFileSize(selectedFile.size);
      setFileType(selectedFile.type);

      setLoading(true);
      setUploadProgress(0);

      try {
        // Upload to Web3.Storage (IPFS)
        setUploadStage("ipfs");
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 45) {
              clearInterval(progressInterval);
              return 45;
            }
            return prev + Math.random() * 10;
          });
        }, 200);

        console.log("UPLOADING to Web3.Storage...");
        const uploadedCid = await client.uploadFile(selectedFile);
        console.log("Web3.Storage upload complete:", uploadedCid);

        clearInterval(progressInterval);
        setUploadProgress(50);

        // Upload file info to smart contract
        setUploadStage("blockchain");
        console.log("UPLOADING to smart contract...");
        
        // Update progress for blockchain transaction
        const blockchainProgressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(blockchainProgressInterval);
              return 90;
            }
            return prev + Math.random() * 8;
          });
        }, 300);

        // Call smart contract uploadFile function
        // Parameters: _fileHash, _fileSize, _fileType, _fileName
        const uploadTxn = await contract.write.uploadFile([
          uploadedCid.toString(),        // _fileHash (CID from IPFS)
          selectedFile.size.toString(),  // _fileSize
          selectedFile.type || "unknown", // _fileType
          selectedFile.name              // _fileName
        ]);

        console.log("Transaction sent:", uploadTxn);
        setTxHash(uploadTxn);
        
        clearInterval(blockchainProgressInterval);
        setUploadProgress(100);
        setUploadStage("complete");
        setCid(uploadedCid.toString());

        setTimeout(() => {
          setUploadProgress(0);
          setUploadStage("");
        }, 3000);

        // Reset file 
        setFile(null);
        setFileName(null);
        setFileSize(null);
        setFileType(null);
      } catch (err) {
        console.error("Upload failed:", err);
        setUploadProgress(0);
        setUploadStage("");
        
        if (err.message.includes("User rejected")) {
          alert("Transaction was rejected by user.");
        } else if (err.message.includes("insufficient funds")) {
          alert("Insufficient funds for gas fees.");
        } else {
          alert(`Upload failed: ${err.message}`);
        }
      }
      setLoading(false);
    };

    input.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  return (
    <div className="min-h-screen w-full min-w-[1535px] overflow-y-auto bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative flex items-center justify-center">
      {/* Background Patterns */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Header */}
      <div className="absolute top-8 left-8 z-10">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
          <h1 className="text-white text-2xl font-light tracking-wider">BlockBin</h1>
        </div>
      </div>

      {/* Wallet Button */}
      <div className="absolute top-8 right-8 z-10">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-1 hover:bg-white/10 transition-all duration-300">
          <ConnectButton />
        </div>
      </div>

      {/* Main */}
      <div className="text-center space-y-8 z-10 max-w-4xl mx-auto px-4">
        <div className="space-y-4">
          <h2 className="text-5xl md:text-6xl font-light text-white tracking-tight">
            Store files on
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-medium">
              the blockchain
            </span>
          </h2>
          <p className="text-gray-300 text-lg font-light max-w-2xl mx-auto leading-relaxed">
            Decentralized file storage with unmatched security and permanence. Upload once, access forever.
          </p>
        </div>

        {/* Initialization Status */}
        {isInitializing && (
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl px-6 py-3 inline-block">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <p className="text-blue-400 font-light">🔄 Initializing Web3 client...</p>
            </div>
          </div>
        )}

        {initError && !client && (
          <div className="backdrop-blur-md bg-red-500/10 border border-red-400/20 rounded-2xl px-6 py-4 inline-block max-w-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 rounded-full bg-red-400/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-400 font-medium">Initialization Failed</p>
            </div>
            <p className="text-red-300 text-sm mb-4">{initError}</p>
            <button
              onClick={retryInitialization}
              className="px-4 py-2 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-all duration-300 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {client && !isInitializing && !initError && (
          <div className="backdrop-blur-md bg-green-500/10 border border-green-400/20 rounded-2xl px-6 py-3 inline-block">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-400/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-400 font-light">✅ Web3 client ready</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {/* Upload Button */}
          <button
            onClick={handleFileUpload}
            disabled={!client || loading}
            className="group relative disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-500 group-disabled:opacity-10"></div>
            <div className="relative flex items-center gap-4 px-8 py-4 rounded-3xl backdrop-blur-md bg-white/10 border border-white/20 text-white font-medium text-lg hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl group-disabled:hover:scale-100 group-disabled:hover:bg-white/10">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </div>
              <span>{loading ? "Uploading..." : "Upload to blockchain"}</span>
              <div className={`w-2 h-2 rounded-full ${client ? "bg-green-400 animate-pulse" : "bg-gray-400"}`}></div>
            </div>
          </button>

          {/* Get Files Button */}
          <button
            onClick={getFilesUploaded}
            disabled={!contract || !address || isGettingFiles}
            className="group relative disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-500 group-disabled:opacity-10"></div>
            <div className="relative flex items-center gap-4 px-8 py-4 rounded-3xl backdrop-blur-md bg-white/10 border border-white/20 text-white font-medium text-lg hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl group-disabled:hover:scale-100 group-disabled:hover:bg-white/10">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                {isGettingFiles ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <span>{isGettingFiles ? "Getting Files..." : "Get My Files"}</span>
              {uploadedFiles.length > 0 && (
                <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center">
                  <span className="text-green-400 text-xs font-bold">{uploadedFiles.length}</span>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* File Metadata */}
        {file && (
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl px-6 py-4 max-w-md mx-auto text-left text-sm text-white space-y-1 mt-4">
            <p><span className="text-gray-400">📄 File Name:</span> {fileName}</p>
            <p><span className="text-gray-400">📦 Size:</span> {(fileSize / (1024 * 1024)).toFixed(2)} MB</p>
            <p><span className="text-gray-400">🧾 Type:</span> {fileType || "Unknown"}</p>
          </div>
        )}

        {/* Upload Progress */}
        {loading && uploadProgress > 0 && (
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-light">
                {uploadStage === "ipfs" && "📡 Uploading to IPFS..."}
                {uploadStage === "blockchain" && "⛓️ Recording on blockchain..."}
                {uploadStage === "complete" && "✅ Upload complete!"}
                {!uploadStage && "Uploading..."}
              </span>
              <span className="text-blue-400 font-medium">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            {uploadStage === "blockchain" && (
              <p className="text-gray-400 text-xs mt-2">
                ⏳ Waiting for blockchain confirmation...
              </p>
            )}
          </div>
        )}

        {/* Files List */}
        {showFilesList && uploadedFiles.length > 0 && (
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-medium">Your Uploaded Files ({uploadedFiles.length})</h3>
              <button
                onClick={() => setShowFilesList(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">{file.fileName}</h4>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>📦 Size: {formatFileSize(Number(file.fileSize))}</p>
                        <p>🧾 Type: {file.fileType}</p>
                        <p>👤 Uploader: {file.uploader.slice(0, 6)}...{file.uploader.slice(-4)}</p>
                        <p>⏰ Uploaded: {formatTimestamp(file.timestamp)}</p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <a
                        href={`https://w3s.link/ipfs/${file.fileHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 text-sm font-medium"
                      >
                        <span>View</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">IPFS Hash</p>
                    <p className="text-white font-mono text-xs break-all">{file.fileHash}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CID display */}
        {cid && (
          <div className="backdrop-blur-md bg-white/5 border border-green-400/20 rounded-2xl p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-green-400 font-medium text-lg">Upload Successful!</h3>
            </div>
            <p className="text-gray-300 text-sm mb-4">Your file has been stored on IPFS and recorded on the blockchain</p>
            
            {/* IPFS CID */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-4">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">IPFS Content ID (CID)</p>
              <p className="text-white font-mono text-sm break-all mb-3">{cid}</p>
              <a
                href={`https://w3s.link/ipfs/${cid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 text-sm font-medium"
              >
                <span>View File on IPFS</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Transaction Hash */}
            {txHash && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Blockchain Transaction</p>
                <p className="text-white font-mono text-sm break-all mb-3">{txHash}</p>
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-all duration-300 text-sm font-medium"
                >
                  <span>View on Etherscan</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
        <div className="absolute bottom-6 right-6 z-10">
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-full px-4 py-2">
          <p className="text-gray-400 text-sm font-light">Powered by Web3.Storage</p>
          </div>
        </div>
    </div>
  );
}

export default App;
