/* frontend/src/Projects.jsx */
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { BarChart3, DatabaseZap, TrendingUp, TrendingDown, ChevronsLeft, RefreshCcw } from 'lucide-react';

// *** BRANDING: Import your logo watermark asset ***
import cigLogoWatermark from './assets/cig-logo-watermark.png';

function Projects() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [projects, setProjects] = useState([])
  const [transactions, setTransactions] = useState([])
  const [fundAmounts, setFundAmounts] = useState({}) 
  const [messages, setMessages] = useState({}) 
  
  const [isLoadingFetch, setIsLoadingFetch] = useState(false)
  const [isLoadingAction, setIsLoadingAction] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  const navigate = useNavigate()

  const fetchData = async (token) => {
    setIsLoadingFetch(true)
    try {
      const userRes = await axios.get('https://cig-backend-62lz.onrender.com/api/user/', { headers: { Authorization: `Bearer ${token}` } })
      setIsAdmin(userRes.data.is_admin)

      const projRes = await axios.get('https://cig-backend-62lz.onrender.com/api/projects/', { headers: { Authorization: `Bearer ${token}` } })
      setProjects(projRes.data)

      const transRes = await axios.get('https://cig-backend-62lz.onrender.com/api/transactions/', { headers: { Authorization: `Bearer ${token}` } })
      setTransactions(transRes.data)
    } catch (err) {
      console.error("Connectivity Lost.")
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

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 4000);
  }

  const approvedTransactions = transactions.filter(t => t.status === 'APPROVED')
  const totalCashIn = approvedTransactions.reduce((total, t) => {
    if (t.transaction_type === 'BUY_SHARE') return total + parseFloat(t.amount)
    if (t.transaction_type === 'SELL_SHARE') return total - parseFloat(t.amount)
    return total
  }, 0)

  const deployedCapital = projects.reduce((total, p) => total + parseFloat(p.capital_invested), 0)
  const liquidCash = totalCashIn - deployedCapital

  const handleFundProject = async (projectId) => {
    const amountStr = fundAmounts[projectId]
    const token = localStorage.getItem('access_token')
    setIsLoadingAction(`${projectId}_FUND`);

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setMessages({ ...messages, [projectId]: `❌ Provide a valid positive K amount.` })
      setIsLoadingAction(null);
      return;
    }

    try {
      const response = await axios.post(`https://cig-backend-62lz.onrender.com/api/projects/${projectId}/fund/`, 
        { amount: amount },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessages({ ...messages, [projectId]: `✅ Deployment successful!` })
      setFundAmounts({ ...fundAmounts, [projectId]: '' }) 
      showToast(`Success: ${response.data.success}`)
      fetchData(token) 
    } catch (err) {
      setMessages({ ...messages, [projectId]: `❌ ${err.response?.data?.error || 'Failed.'}` })
    } finally {
      setIsLoadingAction(null);
    }
  }

  const handleDefundProject = async (projectId) => {
    const amountStr = fundAmounts[projectId]
    const token = localStorage.getItem('access_token')
    setIsLoadingAction(`${projectId}_DEFUND`);

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setMessages({ ...messages, [projectId]: `❌ Provide a valid positive K amount.` })
      setIsLoadingAction(null);
      return;
    }

    try {
      const response = await axios.post(`https://cig-backend-62lz.onrender.com/api/projects/${projectId}/defund/`, 
        { amount: amount },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessages({ ...messages, [projectId]: `↩️ Capital returned to Vault.` })
      setFundAmounts({ ...fundAmounts, [projectId]: '' }) 
      showToast(`Success: ${response.data.success}`)
      fetchData(token) 
    } catch (err) {
      setMessages({ ...messages, [projectId]: `❌ ${err.response?.data?.error || 'Failed.'}` })
    } finally {
      setIsLoadingAction(null);
    }
  }

  return (
    <div className="min-h-screen bg-light-cream p-6 md:p-12 font-sans text-gray-800">
      
      {toastMessage && (
        <div className="fixed top-4 right-4 p-4 rounded-xl shadow-lg border bg-green-900 border-green-700 text-green-200 text-sm font-medium z-50">
          {toastMessage}
        </div>
      )}

      {(isLoadingFetch && !projects.length) && (
          <div className="fixed inset-0 bg-primary-deep-navy/90 flex flex-col items-center justify-center p-6 z-50 text-light-cream">
              <RefreshCcw className="w-16 h-16 animate-spin text-accent-teal mb-4" />
              <p className="font-black text-2xl tracking-widest text-shadow-teal-glow">CIG PROJECT REFRESH</p>
          </div>
      )}

      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-primary-deep-navy">
          <div className="flex items-center gap-4">
            <BarChart3 className="w-10 h-10 text-accent-teal" />
            <h2 className="text-3xl font-black text-primary-deep-navy uppercase tracking-wider">CIG Capital hub</h2>
          </div>
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 p-2.5 rounded-xl bg-gold-highlight text-primary-deep-navy cursor-pointer hover:bg-gold-highlight/90 transition shadow-md flex items-center justify-center">
            <ChevronsLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-primary-deep-navy text-light-cream p-10 rounded-3xl shadow-lg mb-10 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
          
          {/* Navy Header Watermark (Inverse Light CIG Logo) */}
          <img src={cigLogoWatermark} alt="" className="absolute -top-16 -right-16 w-80 h-80 opacity-[0.03] grayscale invert pointer-events-none" />

          <div className="relative z-10">
            <p className="font-medium uppercase tracking-widest text-gold-highlight text-sm mb-1.5 flex items-center gap-2"><TrendingUp className="text-accent-teal" /> Available Liquid Capital</p>
            <h1 className="text-6xl font-black text-white tracking-tight text-shadow-teal-glow">K{liquidCash.toLocaleString()}</h1>
          </div>
          <div className="mt-8 md:mt-0 text-right space-y-2 relative z-10">
            <p className="text-light-cream/70 font-medium text-sm flex items-center gap-2 justify-end">Verified Club Equity: <span className="font-bold text-light-cream text-lg tracking-tight">K{totalCashIn.toLocaleString()}</span></p>
            <p className="text-light-cream/70 font-medium text-sm flex items-center gap-2 justify-end">Deployed Capital: <span className="font-bold text-accent-teal text-lg tracking-tight">K{deployedCapital.toLocaleString()}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative overflow-hidden">
          
          {/* Light Background Watermark */}
          <img src={cigLogoWatermark} alt="" className="absolute -bottom-16 -right-16 w-80 h-80 opacity-5 grayscale pointer-events-none" />

          {projects.length === 0 ? <p className="text-gray-500 italic relative z-10">No projects currently configured.</p> : 
            projects.map((project) => (
              <div key={project.id} className="bg-white p-7 rounded-2xl shadow-sm border border-gold-highlight/10 hover:shadow-lg hover:border-gold-highlight/30 transition border-l-4 border-l-gold-highlight overflow-hidden group relative z-10">
                
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-primary-deep-navy transition group-hover:text-gold-highlight">{project.name}</h3>
                  <span className="bg-primary-deep-navy text-light-cream text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest text-shadow-teal-glow">
                    {project.status}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-8 text-sm leading-relaxed">{project.description}</p>
                <div className="mb-6 pb-6 border-b border-gold-highlight/10">
                    <p className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-1">Active Deployed Capital</p>
                    <span className="text-accent-teal font-black text-3xl tracking-tight text-shadow-teal-glow">K{parseFloat(project.capital_invested).toLocaleString()}</span>
                </div>

                {isAdmin ? (
                  <div className="bg-light-cream p-5 rounded-xl shadow-inner border border-gold-highlight/5 space-y-4 relative z-10">
                    <p className="text-xs font-bold text-gold-highlight uppercase tracking-wider mb-1 flex items-center gap-1.5"><TrendingDown className="text-primary-deep-navy" /> deployment controls (k)</p>
                    <input 
                      type="number" min="1" placeholder="Amount (K)"
                      value={fundAmounts[project.id] || ''} 
                      disabled={isLoadingAction !== null} 
                      onChange={(e) => setFundAmounts({...fundAmounts, [project.id]: e.target.value})} 
                      className="w-full px-5 py-3 bg-white border border-gray-300 rounded-lg text-primary-deep-navy font-bold focus:outline-none focus:ring-2 focus:ring-accent-teal shadow-inner"
                    />
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleFundProject(project.id)} 
                        disabled={isLoadingAction === `${project.id}_FUND`}
                        className="w-1/2 bg-accent-teal hover:bg-accent-teal/90 text-primary-deep-navy font-black px-6 py-3 rounded-lg shadow-md transition duration-200 flex items-center justify-center gap-2"
                      >
                         {isLoadingAction === `${project.id}_FUND` ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 'Deploy Capital' }
                      </button>
                      <button 
                        onClick={() => handleDefundProject(project.id)} 
                        disabled={isLoadingAction === `${project.id}_DEFUND`}
                        className="w-1/2 bg-gold-highlight hover:bg-gold-highlight/90 text-primary-deep-navy font-bold px-6 py-3 rounded-lg shadow-md transition duration-200 flex items-center justify-center gap-2"
                      >
                        {isLoadingAction === `${project.id}_DEFUND` ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 'Return Capital' }
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-primary-deep-navy p-4 rounded-xl border border-primary-deep-navy/80 text-center text-shadow-teal-glow relative z-10">
                    <p className="text-xs text-light-cream/70 font-black uppercase tracking-widest flex items-center justify-center gap-2">View-only access.</p>
                  </div>
                )}
                
                {messages[project.id] && (
                  <p className={`mt-4 text-xs font-medium p-3 rounded-lg relative z-10 ${messages[project.id].includes('❌') ? 'bg-red-950 text-red-200' : 'bg-green-950 text-green-200'}`}>
                    {messages[project.id]}
                  </p>
                )}
              </div>
            ))
          }
        </div>

      </div>
    </div>
  )
}

export default Projects