/* frontend/src/Members.jsx */
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Users, UserCheck, ShieldAlert, ChevronsLeft, RefreshCcw, Mail, Building2, PieChart } from 'lucide-react';

// *** BRANDING: Import your logo watermark asset ***
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
      <div className="bg-slate-50 p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full">
        <h4 className="text-xl font-bold text-primary-deep-navy mb-2">{title}</h4>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-white transition">Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} className="px-5 py-2.5 rounded-lg bg-gold-highlight hover:bg-gold-highlight/90 text-primary-deep-navy font-bold flex items-center gap-2">
            {isLoading && <RefreshCcw className="w-4 h-4 animate-spin" />} Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

function Members() {
  const [users, setUsers] = useState([])
  const [transactions, setTransactions] = useState([]) 
  const [isAdmin, setIsAdmin] = useState(false) 
  const [isLoadingFetch, setIsLoadingFetch] = useState(false)
  const [isLoadingAction, setIsLoadingAction] = useState(null)
  
  const [toastMessage, setToastMessage] = useState('')
  const [confirmModalData, setConfirmModalData] = useState({ isOpen: false, id: null, title: '', message: '' })

  const navigate = useNavigate()

  const fetchData = async (token) => {
    setIsLoadingFetch(true)
    try {
      const [userRes, allUsersRes, transRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/user/', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://127.0.0.1:8000/api/users/', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://127.0.0.1:8000/api/transactions/', { headers: { Authorization: `Bearer ${token}` } })
      ])
      
      setIsAdmin(userRes.data.is_admin)
      setUsers(allUsersRes.data)
      setTransactions(transRes.data)

    } catch (err) {
      showToast('❌ Failed to load directory. Check connection.', 'error')
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
    fetchData(token)
  }, [navigate])

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 4000);
  }

  const closeConfirmModal = () => setConfirmModalData({ isOpen: false, id: null, title: '', message: '' })

  const handleApproveMember = async () => {
    const { id } = confirmModalData;
    const token = localStorage.getItem('access_token')
    setIsLoadingAction(id);
    try {
      await axios.post(`http://127.0.0.1:8000/api/users/${id}/approve/`, {}, { headers: { Authorization: `Bearer ${token}` } })
      showToast('✅ Member access granted successfully.')
      fetchData(token) 
    } catch (err) {
      showToast(`❌ Operation failed.`, 'error');
    } finally {
      closeConfirmModal();
      setIsLoadingAction(null);
    }
  }

  // --- THE CAP TABLE MATH (UPDATED FOR TRANSFERS) ---
  const pendingMembers = users.filter(u => !u.is_approved_member && !u.is_staff)
  const approvedTransactions = transactions.filter(t => t.status === 'APPROVED')

  // Total club shares are NOT affected by transfers
  const totalClubShares = approvedTransactions.reduce((total, t) => {
    if (t.transaction_type === 'BUY_SHARE') return total + parseFloat(t.shares_involved)
    if (t.transaction_type === 'SELL_SHARE') return total - parseFloat(t.shares_involved)
    return total
  }, 0)

  // Map ownership and handle Sender vs Recipient Math
  const approvedMembersWithShares = users
    .filter(u => u.is_approved_member || u.is_staff)
    .map(member => {
      // Find transactions where this member is EITHER the sender OR the recipient
      const memberTx = approvedTransactions.filter(t => String(t.user) === String(member.id) || String(t.recipient) === String(member.id))
      
      const shares = memberTx.reduce((total, t) => {
        if (t.transaction_type === 'BUY_SHARE') return total + parseFloat(t.shares_involved)
        if (t.transaction_type === 'SELL_SHARE') return total - parseFloat(t.shares_involved)
        
        // NEW: Transfer Math Logic
        if (t.transaction_type === 'TRANSFER') {
           if (String(t.user) === String(member.id)) return total - parseFloat(t.shares_involved) // They sent it
           if (String(t.recipient) === String(member.id)) return total + parseFloat(t.shares_involved) // They received it
        }
        return total
      }, 0)

      const ownershipPercentage = totalClubShares > 0 ? ((shares / totalClubShares) * 100).toFixed(1) : 0
      return { ...member, shares, ownershipPercentage }
    })
    .sort((a, b) => b.shares - a.shares) // Sort Highest to Lowest

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-12 font-sans text-gray-800">
      
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      <ConfirmModal 
          isOpen={confirmModalData.isOpen} 
          title={confirmModalData.title} 
          message={confirmModalData.message} 
          onCancel={closeConfirmModal} 
          onConfirm={handleApproveMember} 
          isLoading={isLoadingAction !== null} 
      />

      {(isLoadingFetch && !users.length) && (
          <div className="fixed inset-0 bg-primary-deep-navy/90 flex flex-col items-center justify-center p-6 z-50 text-slate-100">
              <RefreshCcw className="w-16 h-16 animate-spin text-accent-teal mb-4" />
              <p className="font-black text-2xl tracking-widest text-shadow-teal-glow uppercase">CIG Directory Refresh</p>
          </div>
      )}

      <div className="max-w-6xl mx-auto relative overflow-hidden">
        
        <img src={cigLogoWatermark} alt="" className="absolute top-40 right-10 w-[600px] h-[600px] opacity-5 grayscale pointer-events-none z-0" />

        <div className="flex justify-between items-center mb-10 pb-6 border-b border-primary-deep-navy relative z-10">
          <div className="flex items-center gap-4">
            <Users className="w-10 h-10 text-accent-teal" />
            <h2 className="text-3xl font-black text-primary-deep-navy uppercase tracking-wider">CIG Corporate Directory</h2>
          </div>
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 p-2.5 rounded-xl bg-gold-highlight text-primary-deep-navy cursor-pointer hover:bg-gold-highlight/90 transition shadow-md flex items-center justify-center">
            <ChevronsLeft className="w-6 h-6" />
          </button>
        </div>

        {(isAdmin && pendingMembers.length > 0) && (
          <div className="bg-primary-deep-navy p-8 rounded-3xl border-t-8 border-gold-highlight shadow-xl mb-12 relative overflow-hidden group z-10">
            <img src={cigLogoWatermark} alt="" className="absolute -top-16 -right-16 w-80 h-80 opacity-[0.03] grayscale invert pointer-events-none transition group-hover:scale-105" />
            
            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3 relative z-10">
              <ShieldAlert className="text-gold-highlight w-8 h-8" /> Action Required: Pending Access ({pendingMembers.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {pendingMembers.map(user => (
                <div key={user.id} className="bg-slate-50/10 border border-gold-highlight/20 p-5 rounded-2xl flex justify-between items-center backdrop-blur-sm">
                  <div>
                    <p className="text-gold-highlight text-xs font-black uppercase tracking-widest mb-1">MEMBER ID #{user.id}</p>
                    <h4 className="text-lg font-bold text-white">{user.username}</h4>
                    <p className="text-sm text-slate-300 flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> {user.email || 'No email provided'}</p>
                  </div>
                  <button 
                    onClick={() => setConfirmModalData({ 
                      isOpen: true, id: user.id, 
                      title: 'Approve Platform Access', 
                      message: `Are you sure you want to verify User #${user.id} (${user.username})? This grants them access to view the dashboard and submit share requests.` 
                    })} 
                    className="bg-accent-teal hover:bg-accent-teal/90 text-primary-deep-navy font-black px-5 py-2.5 rounded-xl transition shadow-md text-sm whitespace-nowrap"
                  >
                    Grant Access
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gold-highlight/10 mb-12 relative z-10 border-l-4 border-l-accent-teal">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <PieChart className="w-6 h-6 text-primary-deep-navy" />
            <h3 className="text-2xl font-black text-primary-deep-navy uppercase tracking-wider">Club Capitalization Table</h3>
          </div>
          
          <div className="space-y-6">
            {approvedMembersWithShares.length === 0 ? <p className="text-gray-500 italic">No verified shares recorded.</p> : 
              approvedMembersWithShares.map(member => (
                <div key={`cap-${member.id}`} className="group">
                  <div className="flex justify-between items-end text-sm mb-2">
                    <div>
                       <span className="font-bold text-primary-deep-navy text-base">{member.first_name || member.username} {member.last_name}</span> 
                       <span className="text-gray-400 font-medium ml-2">({member.shares} shares)</span>
                    </div>
                    <span className="text-accent-teal font-black text-lg">{member.ownershipPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 shadow-inner overflow-hidden">
                    <div 
                      className="bg-accent-teal h-3 rounded-full transition-all duration-1000 ease-out group-hover:bg-gold-highlight shadow-teal-glow" 
                      style={{ width: `${member.ownershipPercentage}%` }}
                    ></div>
                  </div>
                </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
               <Building2 className="w-6 h-6 text-primary-deep-navy" />
               <h3 className="text-2xl font-black text-primary-deep-navy uppercase tracking-wider">Verified Membership Roster</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {approvedMembersWithShares.map(user => (
                <div key={user.id} className="bg-slate-50 p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-accent-teal/50 transition border-t-4 border-t-primary-deep-navy relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary-deep-navy/5 flex items-center justify-center border border-primary-deep-navy/10">
                       <UserCheck className="w-6 h-6 text-primary-deep-navy" />
                    </div>
                    {user.is_staff && (
                      <span className="bg-gold-highlight text-primary-deep-navy text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest shadow-sm">Admin</span>
                    )}
                  </div>
                  
                  <h4 className="text-xl font-bold text-primary-deep-navy mb-1">{user.first_name || user.username} {user.last_name}</h4>
                  <p className="text-sm font-medium text-gray-500 mb-4">{user.email || 'Member Account'}</p>
                  
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">CIG ID: #{user.id}</p>
                    <p className="text-xs font-black text-gold-highlight uppercase tracking-widest">{user.ownershipPercentage}% Equity</p>
                  </div>
                </div>
              ))}
            </div>
        </div>

      </div>
    </div>
  )
}

export default Members