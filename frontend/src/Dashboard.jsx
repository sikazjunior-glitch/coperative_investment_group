/* frontend/src/Dashboard.jsx */
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import { Target, BarChart3, MailSearch, RefreshCcw, LogOut, ArrowRightLeft, ArrowDownRight, ArrowUpRight, Send, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import cigLogoWatermark from './assets/cig-logo.jpg'; 

const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const isError = message.includes('❌') || type === 'error';
  return (
    <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-0 ${isError ? 'bg-red-900 border-red-700 text-red-200' : 'bg-green-900 border-green-700 text-green-200'} z-50`}>
      {message}
      <button onClick={onClose} className="absolute top-1 right-2 text-white/50 hover:text-white">×</button>
    </div>
  )
}

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-primary-deep-navy/80 flex items-center justify-center p-6 z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full">
        <h4 className="text-xl font-bold text-primary-deep-navy mb-2">{title}</h4>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} className="px-5 py-2.5 rounded-lg bg-gold-highlight hover:bg-gold-highlight/90 text-primary-deep-navy font-bold flex items-center gap-2">
            {isLoading && <RefreshCcw className="w-4 h-4 animate-spin" />} Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const [projects, setProjects] = useState([])
  const [transactions, setTransactions] = useState([])
  const [users, setUsers] = useState([]) 
  const [userId, setUserId] = useState(null)
  const [userDisplayName, setUserDisplayName] = useState('') 
  const [isAdmin, setIsAdmin] = useState(false) 
  
  const [tradeMode, setTradeMode] = useState('BUY') 
  const [tradeAmount, setTradeAmount] = useState(1)
  const [tradeRecipient, setTradeRecipient] = useState('') 
  
  const [error, setError] = useState('')
  const [isLoadingFetch, setIsLoadingFetch] = useState(false)
  const [isLoadingTrade, setIsLoadingTrade] = useState(false)
  const [isLoadingAdminAction, setIsLoadingAdminAction] = useState(null) 

  const [toastMessage, setToastMessage] = useState('')
  const [confirmModalData, setConfirmModalData] = useState({ isOpen: false, type: '', id: null, title: '', message: '' })
  
  const navigate = useNavigate()

  const fetchData = async (token) => {
    setIsLoadingFetch(true)
    setError('')
    try {
      const userRes = await axios.get('https://cig-backend-62lz.onrender.com/api/user/', { headers: { Authorization: `Bearer ${token}` } })
      const { username, first_name, is_admin } = userRes.data
      setUserDisplayName(first_name || username) 
      setIsAdmin(is_admin) 

      const [projRes, transRes, usersRes] = await Promise.all([
         axios.get('https://cig-backend-62lz.onrender.com/api/projects/', { headers: { Authorization: `Bearer ${token}` } }),
         axios.get('https://cig-backend-62lz.onrender.com/api/transactions/', { headers: { Authorization: `Bearer ${token}` } }),
         axios.get('https://cig-backend-62lz.onrender.com/api/users/', { headers: { Authorization: `Bearer ${token}` } })
      ])
      
      setProjects(projRes.data)
      setTransactions(transRes.data)
      setUsers(usersRes.data.filter(u => u.is_approved_member)) 

    } catch (err) {
      setError('❌ System connectivity lost. Trying to reconnect...')
    } finally {
      setIsLoadingFetch(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/')
      return
    }
    const decoded = jwtDecode(token)
    setUserId(decoded.user_id)
    fetchData(token)
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/')
  }

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 4000);
  }
  const showConfirmModal = (type, id, title, message) => setConfirmModalData({ isOpen: true, type, id, title, message })
  const closeConfirmModal = () => setConfirmModalData({ isOpen: false, type: '', id: null, title: '', message: '' })

  const handleTrade = async (e) => {
    e.preventDefault()
    setIsLoadingTrade(true)
    const token = localStorage.getItem('access_token')

    const amountInt = parseInt(tradeAmount)
    if (isNaN(amountInt) || amountInt <= 0) {
      showToast('❌ Provide a valid positive number of shares.', 'error');
      setIsLoadingTrade(false); return;
    }

    if (tradeMode === 'TRANSFER' && !tradeRecipient) {
      showToast('❌ Please select a recipient member.', 'error');
      setIsLoadingTrade(false); return;
    }

    const endpoint = tradeMode === 'BUY' ? 'buy_shares' : tradeMode === 'SELL' ? 'sell_shares' : 'transfer_shares';
    const payload = tradeMode === 'TRANSFER' ? { shares: amountInt, recipient_id: tradeRecipient } : { shares: amountInt };

    try {
      await axios.post(`https://cig-backend-62lz.onrender.com/api/transactions/${endpoint}/`, payload, { headers: { Authorization: `Bearer ${token}` } })
      showToast(`✅ Request submitted to Admin for verification.`)
      setTradeAmount(1)
      fetchData(token) 
    } catch (err) {
      showToast(`❌ ${err.response?.data?.error || 'An error occurred.'}`, 'error');
    } finally {
      setIsLoadingTrade(false)
    }
  }

  const handleConfirmAction = async () => {
    const { type, id } = confirmModalData;
    const token = localStorage.getItem('access_token')
    setIsLoadingAdminAction(id);
    try {
      if (type === 'VOID') await axios.delete(`https://cig-backend-62lz.onrender.com/api/transactions/${id}/`, { headers: { Authorization: `Bearer ${token}` } })
      else if (type === 'APPROVE') await axios.post(`https://cig-backend-62lz.onrender.com/api/transactions/${id}/approve/`, {}, { headers: { Authorization: `Bearer ${token}` } })
      else if (type === 'DECLINE') await axios.post(`https://cig-backend-62lz.onrender.com/api/transactions/${id}/decline/`, {}, { headers: { Authorization: `Bearer ${token}` } })
      
      showToast('✅ Ledger successfully updated.')
      fetchData(token) 
    } catch (err) {
      showToast(`❌ Operation failed.`, 'error');
    } finally {
      closeConfirmModal();
      setIsLoadingAdminAction(null);
    }
  }

  const approvedTransactions = transactions.filter(t => t.status === 'APPROVED')
  const pendingTransactions = transactions.filter(t => t.status === 'PENDING')

  const totalClubShares = approvedTransactions.reduce((total, t) => {
    if (t.transaction_type === 'BUY_SHARE') return total + parseFloat(t.shares_involved)
    if (t.transaction_type === 'SELL_SHARE') return total - parseFloat(t.shares_involved)
    return total
  }, 0)
  
  const clubProgressPercentage = (totalClubShares / 100) * 100

  const myApprovedTransactions = approvedTransactions.filter(t => String(t.user) === String(userId) || String(t.recipient) === String(userId))
  const myPendingTransactions = pendingTransactions.filter(t => String(t.user) === String(userId) || String(t.recipient) === String(userId))
  
  const myTotalShares = myApprovedTransactions.reduce((total, t) => {
    if (t.transaction_type === 'BUY_SHARE') return total + parseFloat(t.shares_involved)
    if (t.transaction_type === 'SELL_SHARE') return total - parseFloat(t.shares_involved)
    if (t.transaction_type === 'TRANSFER') {
       if (String(t.user) === String(userId)) return total - parseFloat(t.shares_involved) 
       if (String(t.recipient) === String(userId)) return total + parseFloat(t.shares_involved) 
    }
    return total
  }, 0)

  const myPortfolioValue = myTotalShares * 10000 

  // --- UPGRADED PDF GENERATOR FUNCTION ---
  const generatePDFStatement = (isMaster = false) => {
    const doc = new jsPDF();
    const isClubMaster = isMaster && isAdmin;

    // 1. Header Styling
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // Primary Deep Navy
    doc.text(isClubMaster ? "CIG HUB - MASTER CLUB LEDGER" : "CIG HUB - OFFICIAL ACCOUNT STATEMENT", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(isClubMaster ? `Administrator: ${userDisplayName}` : `Member Account: ${userDisplayName} (ID: #${userId})`, 14, 32);
    doc.text(`Document Generated: ${new Date().toLocaleString()}`, 14, 38);
    
    // 2. Summary Block
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    if (isClubMaster) {
        doc.text(`Total Club Capital: K${(totalClubShares * 10000).toLocaleString()}`, 14, 50);
        doc.text(`Total Active Shares: ${totalClubShares} / 100 Shares`, 14, 56);
    } else {
        doc.text(`Total Verified Equity: K${myPortfolioValue.toLocaleString()}`, 14, 50);
        doc.text(`Total Shares Owned: ${myTotalShares} Shares`, 14, 56);
    }

    // 3. Prepare Table Data (Include Status Column)
    const tableColumn = ["Date", "Type", "Parties Involved", "Shares", "Value (K)", "Status"];
    const tableRows = [];

    // If Master, pull EVERY transaction. If normal, pull User's (Approved + Pending)
    const txListToPrint = isClubMaster 
        ? transactions 
        : [...myApprovedTransactions, ...myPendingTransactions];

    const sortedTx = [...txListToPrint].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedTx.forEach(t => {
        const txDate = new Date(t.timestamp).toLocaleDateString();

        let type = "";
        let details = "";
        let shareStr = "";

        if (t.transaction_type === 'BUY_SHARE') {
            type = "BUY"; details = isClubMaster ? `User #${t.user} Bought` : "Purchased from Treasury"; shareStr = `+${parseFloat(t.shares_involved)}`;
        } else if (t.transaction_type === 'SELL_SHARE') {
            type = "LIQUIDATE"; details = isClubMaster ? `User #${t.user} Sold` : "Sold to Treasury"; shareStr = `-${parseFloat(t.shares_involved)}`;
        } else if (t.transaction_type === 'TRANSFER') {
            if (!isClubMaster && String(t.user) === String(userId)) {
                type = "TRANSFER OUT"; details = `Sent to Member #${t.recipient}`; shareStr = `-${parseFloat(t.shares_involved)}`;
            } else if (!isClubMaster && String(t.recipient) === String(userId)) {
                type = "TRANSFER IN"; details = `Received from Member #${t.user}`; shareStr = `+${parseFloat(t.shares_involved)}`;
            } else {
                type = "TRANSFER"; details = `#${t.user} sent to #${t.recipient}`; shareStr = `${parseFloat(t.shares_involved)}`;
            }
        } else if (t.transaction_type === 'DIVIDEND') {
            type = "DIVIDEND"; details = "Profit Distribution Payout"; shareStr = "-"; 
        }

        const valStr = t.amount > 0 ? `K${parseFloat(t.amount).toLocaleString()}` : "N/A";
        const statusStr = t.status || "APPROVED";

        tableRows.push([txDate, type, details, shareStr, valStr, statusStr]);
    });

    // 4. Draw the Table
    autoTable(doc, {
        startY: 65,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }, 
        alternateRowStyles: { fillColor: [248, 250, 252] }, 
        styles: { fontSize: 9, cellPadding: 4 }
    });

    // 5. Footer Watermark
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Cooperative Investment Group (CIG) - Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    // 6. Save File
    const fileName = isClubMaster ? `CIG_Master_Ledger_${new Date().toISOString().split('T')[0]}.pdf` : `CIG_Statement_ID${userId}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  // --- INTERNAL HELPER FUNCTIONS ---
  const renderCIGLogoBanner = () => (
    <div className="mb-8">
      <div className="p-8 rounded-t-2xl bg-primary-deep-navy shadow-inner border-b-4 border-gold-highlight flex flex-col md:flex-row items-start md:items-center justify-between text-light-cream gap-4 relative overflow-hidden">
        <img src={cigLogoWatermark} alt="" className="absolute -top-16 -right-16 w-80 h-80 opacity-[0.03] grayscale invert pointer-events-none" />
        <div className="flex gap-4 items-center relative z-10">
          <div className="w-16 h-16 bg-white rounded-full border-2 border-gold-highlight flex items-center justify-center p-1 shadow-md overflow-hidden">
             <img src={cigLogoWatermark} alt="cig-logo-watermark" className="w-full h-full object-contain rounded-full" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white text-shadow-teal-glow uppercase tracking-wider">CIG Hub</h1>
            <p className="font-medium text-gold-highlight uppercase text-xs tracking-widest mt-1">Creating Financial Ladders That Sustain Individual Wealth</p>
          </div>
        </div>
        <div className="text-left md:text-right relative z-10">
           <p className="text-sm text-light-cream/70 font-medium tracking-widest uppercase mb-1">Welcome back,</p>
           <p className="text-xl font-bold text-white tracking-wider">{userDisplayName}</p>
        </div>
      </div>

      <div className="bg-white p-3 rounded-b-2xl shadow-sm border border-t-0 border-gray-100 flex flex-wrap gap-2">
        <button onClick={() => navigate('/dividends')} className="flex-1 bg-light-cream hover:bg-white border border-gray-200 hover:border-accent-teal hover:shadow-md text-primary-deep-navy font-black px-4 py-3 rounded-xl transition text-sm uppercase tracking-wider">Dividends</button>
        <button onClick={() => navigate('/members')} className="flex-1 bg-light-cream hover:bg-white border border-gray-200 hover:border-accent-teal hover:shadow-md text-primary-deep-navy font-black px-4 py-3 rounded-xl transition text-sm uppercase tracking-wider">Directory</button>
        <button onClick={() => navigate('/projects')} className="flex-1 bg-light-cream hover:bg-white border border-gray-200 hover:border-accent-teal hover:shadow-md text-primary-deep-navy font-black px-4 py-3 rounded-xl transition text-sm uppercase tracking-wider">Projects</button>
        <button onClick={handleLogout} className="flex-none bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 font-black px-6 py-3 rounded-xl transition text-sm uppercase tracking-wider flex items-center justify-center gap-2">
           <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  )

  const renderProgressBar = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
      <img src={cigLogoWatermark} alt="" className="absolute -bottom-16 -left-16 w-80 h-80 opacity-5 grayscale pointer-events-none" />
      <div className="flex justify-between items-end mb-2 relative z-10">
        <h3 className="text-lg font-semibold text-primary-deep-navy">Club Capital Target</h3>
        <span className="text-sm font-medium text-gray-500">{totalClubShares} / 100 Shares</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner relative z-10">
        <div 
          className="bg-accent-teal h-4 rounded-full transition-all duration-700 ease-out shadow-teal-glow"
          style={{ width: `${clubProgressPercentage}%` }}
        ></div>
      </div>
    </div>
  )

  const renderPortfolioCard = () => (
    <div className="bg-white p-7 rounded-2xl shadow-sm border border-gold-highlight/20 border-l-gold-highlight border-l-4">
      <p className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-1">My Equity Value</p>
      <h1 className="text-5xl font-black text-primary-deep-navy tracking-tight mb-2">K{myPortfolioValue.toLocaleString()}</h1>
      <p className="text-gray-600 font-medium text-sm flex items-center gap-2 mb-8">
        Total Owned: <span className="font-extrabold text-gold-highlight text-lg text-shadow-teal-glow">{myTotalShares} Shares</span>
      </p>
      
      {/* UPGRADED: Download Header with Master Ledger access for Admin */}
      <div className="flex justify-between items-end border-b border-gray-100 pb-2 mb-4">
        <h5 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Verified Ledger</h5>
        <div className="flex gap-2">
          {isAdmin && (
             <button 
                onClick={() => generatePDFStatement(true)} 
                className="text-xs font-bold bg-gold-highlight/20 hover:bg-gold-highlight/40 text-primary-deep-navy px-3 py-1.5 rounded-md transition flex items-center gap-1 border border-gold-highlight/30"
             >
               <Download className="w-3.5 h-3.5" /> Master Ledger
             </button>
          )}
          <button 
             onClick={() => generatePDFStatement(false)} 
             className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-primary-deep-navy px-3 py-1.5 rounded-md transition flex items-center gap-1 border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" /> My Statement
          </button>
        </div>
      </div>

      <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {myApprovedTransactions.length === 0 ? <p className="text-gray-500 text-sm italic">No entries yet.</p> : 
          myApprovedTransactions.map(t => {
            const isBuy = t.transaction_type === 'BUY_SHARE';
            const isSell = t.transaction_type === 'SELL_SHARE';
            const isTransferIn = t.transaction_type === 'TRANSFER' && String(t.recipient) === String(userId);
            
            const isGaining = isBuy || isTransferIn;

            return (
            <li key={t.id} className="flex justify-between items-center text-sm bg-light-cream p-3.5 rounded-xl border border-gold-highlight/10">
              <span className="text-gray-500 font-medium">{new Date(t.timestamp).toLocaleDateString()}</span>
              <div className="flex items-center gap-4">
                <span className={`font-bold ${isGaining ? 'text-accent-teal' : 'text-gold-highlight'}`}>
                  {isBuy ? 'Bought' : isSell ? 'Sold' : isTransferIn ? 'Received' : 'Transferred'} {parseFloat(t.shares_involved)} shares
                </span>
                {isAdmin && (
                  <button onClick={() => showConfirmModal('VOID', t.id, 'Confirm VOID', `Void transaction #${t.id}?`)} className="text-[10px] text-gray-400 hover:text-red-600 font-bold uppercase transition">Void</button>
                )}
              </div>
            </li>
          )})}
      </ul>
    </div>
  )

  const renderTradingDesk = () => (
    <div className="bg-white p-7 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
      <h3 className="text-2xl font-black text-primary-deep-navy mb-5 flex items-center gap-2"><ArrowRightLeft className="text-gold-highlight" /> CIG Trading Desk</h3>
      
      <div className="flex bg-light-cream rounded-lg p-1 mb-6 border border-gray-200">
        <button 
          type="button" 
          onClick={() => setTradeMode('BUY')} 
          className={`flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${tradeMode === 'BUY' ? 'bg-white shadow-sm text-accent-teal border border-accent-teal/20' : 'text-gray-500 hover:text-primary-deep-navy'}`}
        >
          Buy
        </button>
        <button 
          type="button" 
          onClick={() => setTradeMode('SELL')} 
          className={`flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${tradeMode === 'SELL' ? 'bg-white shadow-sm text-gold-highlight border border-gold-highlight/20' : 'text-gray-500 hover:text-primary-deep-navy'}`}
        >
          Liquidate
        </button>
        <button 
          type="button" 
          onClick={() => setTradeMode('TRANSFER')} 
          className={`flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${tradeMode === 'TRANSFER' ? 'bg-white shadow-sm text-primary-deep-navy border border-primary-deep-navy/20' : 'text-gray-500 hover:text-primary-deep-navy'}`}
        >
          Transfer
        </button>
      </div>

      <div className={`p-5 rounded-xl border ${tradeMode === 'BUY' ? 'bg-accent-teal/5 border-accent-teal/20' : tradeMode === 'SELL' ? 'bg-gold-highlight/5 border-gold-highlight/20' : 'bg-primary-deep-navy/5 border-primary-deep-navy/20'}`}>
        <p className="text-primary-deep-navy text-sm mb-4">
           {tradeMode === 'TRANSFER' ? 'Transfer equity securely to another member.' : 'Official Price: K10,000 / share'}
        </p>
        
        <form onSubmit={handleTrade} className="flex flex-col gap-3">
          {tradeMode === 'TRANSFER' && (
             <select 
               required
               value={tradeRecipient} 
               onChange={(e) => setTradeRecipient(e.target.value)}
               className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-primary-deep-navy font-bold focus:outline-none focus:ring-2 focus:ring-primary-deep-navy shadow-inner"
             >
                <option value="" disabled>Select Recipient Member...</option>
                {users.filter(u => String(u.id) !== String(userId)).map(u => (
                   <option key={u.id} value={u.id}>{u.first_name || u.username} {u.last_name} (ID: #{u.id})</option>
                ))}
             </select>
          )}

          <div className="flex gap-3">
            <input 
              type="number" min="1" step="1" placeholder="Shares"
              value={tradeAmount} disabled={isLoadingTrade} onChange={(e) => setTradeAmount(e.target.value)} 
              className="w-24 px-4 py-3 bg-white border border-gray-300 rounded-lg text-primary-deep-navy font-bold focus:outline-none focus:ring-2 focus:ring-primary-deep-navy shadow-inner"
            />
            <button 
              type="submit" disabled={isLoadingTrade} 
              className={`flex-1 font-black px-4 py-3 rounded-lg shadow-md transition duration-200 flex items-center justify-center gap-2 ${tradeMode === 'BUY' ? 'bg-accent-teal text-primary-deep-navy hover:bg-accent-teal/90' : tradeMode === 'SELL' ? 'bg-gold-highlight text-primary-deep-navy hover:bg-gold-highlight/90' : 'bg-primary-deep-navy text-white hover:bg-primary-deep-navy/90'}`}
            >
              {isLoadingTrade ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 
               tradeMode === 'BUY' ? <><ArrowDownRight className="w-5 h-5"/> Buy</> : 
               tradeMode === 'SELL' ? <><ArrowUpRight className="w-5 h-5"/> Sell</> : 
               <><Send className="w-5 h-5"/> Send Equity</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  const renderAdminInbox = () => (
    <div className="bg-white p-7 rounded-2xl border border-gold-highlight border-l-gold-highlight border-l-4 shadow-md mb-8">
      <h3 className="text-2xl font-black text-primary-deep-navy mb-4 flex items-center gap-2">
        <MailSearch className="text-gold-highlight" /> CIG Action Inbox ({pendingTransactions.length} Pending)
      </h3>
      <div className="space-y-4">
        {pendingTransactions.map(t => {
          const isBuy = t.transaction_type === 'BUY_SHARE';
          const isSell = t.transaction_type === 'SELL_SHARE';
          const isTransfer = t.transaction_type === 'TRANSFER';
          
          return (
          <div key={t.id} className="flex justify-between items-center bg-light-cream p-5 rounded-xl border border-gold-highlight/10 shadow-sm relative overflow-hidden">
             {isLoadingAdminAction === t.id && (
                <div className="absolute inset-0 bg-accent-teal/80 flex items-center justify-center z-10">
                   <RefreshCcw className="w-8 h-8 animate-spin text-white" />
                </div>
             )}
            <div className="max-w-[60%]">
              <p className="text-sm font-medium text-gray-500 tracking-wider mb-1">
                ENTRY #{t.id} • {isTransfer ? 'P2P TRANSFER' : isBuy ? 'CASH IN' : 'CASH OUT'}
              </p>
              <h4 className="text-lg font-bold text-gray-800">
                User #{t.user} wants to <span className={`font-black text-shadow-teal-glow ${isBuy ? 'text-accent-teal' : isTransfer ? 'text-primary-deep-navy' : 'text-gold-highlight'}`}>{isBuy ? 'BUY' : isSell ? 'LIQUIDATE' : `TRANSFER TO #${t.recipient}`} {parseFloat(t.shares_involved)} shares</span>
              </h4>
              <p className="text-xs text-primary-deep-navy font-medium mt-1">
                {isTransfer ? 'P2P Direct Trade' : `Value: K${parseFloat(t.amount).toLocaleString()}`} • {new Date(t.timestamp).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => showConfirmModal('APPROVE', t.id, 'Confirm Action', `Approve this ${t.transaction_type} request for User #${t.user}?`)} className="bg-accent-teal hover:bg-accent-teal/90 text-primary-deep-navy font-extrabold px-4 py-2 rounded-lg transition text-sm">Approve</button>
              <button onClick={() => showConfirmModal('DECLINE', t.id, 'Decline Request', `Decline this request from User #${t.user}?`)} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-4 py-2 rounded-lg transition text-sm">Decline</button>
            </div>
          </div>
        )})}
      </div>
    </div>
  )

  const renderPendingNotice = () => (
    <div className="bg-light-cream border border-accent-teal/30 p-7 rounded-2xl mb-8 shadow-inner border-l-accent-teal border-l-4 relative overflow-hidden">
      <img src={cigLogoWatermark} alt="" className="absolute -bottom-16 -right-16 w-80 h-80 opacity-5 grayscale pointer-events-none" />
      <h3 className="text-2xl font-black text-primary-deep-navy mb-4 flex items-center gap-3 text-shadow-teal-glow relative z-10"><Target className="text-accent-teal" /> Awaiting Admin Verification ({myPendingTransactions.length})</h3>
      <ul className="space-y-3 relative z-10">
        {myPendingTransactions.map(t => {
          const isBuy = t.transaction_type === 'BUY_SHARE';
          const isTransfer = t.transaction_type === 'TRANSFER';
          return (
          <li key={t.id} className="text-sm bg-white p-4 rounded-xl border border-accent-teal/10 text-primary-deep-navy font-medium flex justify-between items-center shadow-sm">
            <div>
               <span className={`font-black uppercase tracking-wider text-xs mr-3 px-2 py-1 rounded ${isBuy ? 'bg-accent-teal/20 text-accent-teal' : isTransfer ? 'bg-primary-deep-navy/10 text-primary-deep-navy' : 'bg-gold-highlight/20 text-gold-highlight'}`}>
                  {isBuy ? 'Buying' : isTransfer ? 'Transferring' : 'Selling'}
               </span>
               <span>#{t.id} • {parseFloat(t.shares_involved)} shares</span>
            </div>
            <span className="text-gold-highlight font-black animate-pulse uppercase tracking-wider text-shadow-teal-glow">Checking...</span>
          </li>
        )})}
      </ul>
    </div>
  )

  // --- FINAL RENDER ---
  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-12 font-sans text-gray-800">
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      <ConfirmModal isOpen={confirmModalData.isOpen} title={confirmModalData.title} message={confirmModalData.message} onCancel={closeConfirmModal} onConfirm={handleConfirmAction} isLoading={isLoadingAdminAction !== null} />
      
      {(isLoadingFetch && !error) && ( <div className="fixed inset-0 bg-primary-deep-navy/90 flex flex-col items-center justify-center p-6 z-50 text-light-cream"><RefreshCcw className="w-16 h-16 animate-spin text-accent-teal mb-4" /><p className="font-black text-2xl tracking-widest text-shadow-teal-glow">CIG LEDGER REFRESH</p></div>)}

      <div className="max-w-6xl mx-auto">
        {renderCIGLogoBanner()}
        {error && <p className="text-red-300 bg-red-950 border border-red-700 p-5 rounded-xl mb-6 font-medium text-sm text-shadow-teal-glow">{error}</p>}
        {(isAdmin && pendingTransactions.length > 0) && renderAdminInbox()}
        {(!isAdmin && myPendingTransactions.length > 0) && renderPendingNotice()}
        {renderProgressBar()}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative overflow-hidden">
          <div className="space-y-8">
             {renderPortfolioCard()}
             {renderTradingDesk()}
          </div>
          <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-100 h-full">
            <h3 className="text-2xl font-black text-primary-deep-navy mb-6 flex items-center gap-2"><BarChart3 className="text-gold-highlight" /> Active Projects Hub</h3>
            {projects.length === 0 ? <p className="text-gray-500 italic">No capital currently deployed.</p> : 
              <ul className="space-y-4">
                {projects.map((project) => (
                  <li key={project.id} className="p-6 bg-light-cream border border-gray-100 rounded-xl shadow-inner hover:shadow-md transition border-l-4 border-l-accent-teal group">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xl font-extrabold text-primary-deep-navy group-hover:text-gold-highlight transition">{project.name}</h4>
                      <span className="bg-gold-highlight text-primary-deep-navy text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest text-shadow-teal-glow">{project.status}</span>
                    </div>
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">{project.description}</p>
                    <p className="text-primary-deep-navy font-medium mb-1.5 text-shadow-teal-glow flex justify-between items-baseline border-b border-gold-highlight/10 pb-2">Active Club Capital:<span className="text-gold-highlight font-black text-3xl tracking-tight">K{parseFloat(project.capital_invested).toLocaleString()}</span></p>
                  </li>
                ))}
              </ul>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard