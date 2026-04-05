/* frontend/src/Dividends.jsx */
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import { Target, TrendingUp, DollarSign, Target as CIGIcon, ChevronsLeft, RefreshCcw } from 'lucide-react';

// *** BRANDING: Import your logo watermark asset ***
import cigLogoWatermark from './assets/cig-logo-watermark.png';

function Dividends() {
  const [transactions, setTransactions] = useState([])
  const [userId, setUserId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false) 
  
  const [profitAmount, setProfitAmount] = useState('')
  const [message, setMessage] = useState('')
  
  const [isLoadingFetch, setIsLoadingFetch] = useState(false)
  const [isLoadingPayout, setIsLoadingPayout] = useState(false)

  const navigate = useNavigate()

  const fetchData = async (token) => {
    setIsLoadingFetch(true)
    try {
      const userRes = await axios.get('https://cig-backend-62lz.onrender.com/api/user/', { headers: { Authorization: `Bearer ${token}` } })
      setIsAdmin(userRes.data.is_admin)

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
    const decoded = jwtDecode(token)
    setUserId(decoded.user_id)
    fetchData(token)
  }, [navigate])

  const approvedTransactions = transactions.filter(t => t.status === 'APPROVED')
  const myDividends = approvedTransactions.filter(t => String(t.user) === String(userId) && t.transaction_type === 'DIVIDEND')
  const totalDividendsEarned = myDividends.reduce((total, t) => total + parseFloat(t.amount), 0)

  const handleDeclareDividend = async (e) => {
    e.preventDefault()
    setMessage('Processing payout...')
    setIsLoadingPayout(true)
    const token = localStorage.getItem('access_token')

    const profitAmountFloat = parseFloat(profitAmount);
    if (isNaN(profitAmountFloat) || profitAmountFloat <= 0) {
      setMessage(`❌ Provide valid positive profit amount.`)
      setIsLoadingPayout(false)
      return;
    }

    try {
      const response = await axios.post('https://cig-backend-62lz.onrender.com/api/transactions/distribute_dividend/', 
        { amount: profitAmountFloat },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessage(`✅ ${response.data.success}`)
      setProfitAmount('')
      fetchData(token)
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.error || 'Failed.'}`)
    } finally {
      setIsLoadingPayout(false)
    }
  }

  return (
    <div className="min-h-screen bg-light-cream p-6 md:p-12 font-sans text-gray-800">
      
      {(isLoadingFetch && !transactions.length) && (
          <div className="fixed inset-0 bg-primary-deep-navy/90 flex flex-col items-center justify-center p-6 z-50 text-light-cream">
              <RefreshCcw className="w-16 h-16 animate-spin text-accent-teal mb-4" />
              <p className="font-black text-2xl tracking-widest text-shadow-teal-glow">CIG LEDGER REFRESH</p>
          </div>
      )}

      <div className="max-w-4xl mx-auto relative overflow-hidden">
        
        {/* Light Background Watermark */}
        <img src={cigLogoWatermark} alt="" className="absolute -bottom-16 -left-16 w-80 h-80 opacity-5 grayscale pointer-events-none z-0" />

        <div className="flex justify-between items-center mb-10 pb-6 border-b border-primary-deep-navy relative z-10">
          <div className="flex items-center gap-4">
            <TrendingUp className="w-10 h-10 text-accent-teal" />
            <h2 className="text-3xl font-black text-primary-deep-navy uppercase tracking-wider">CIG Equity hub</h2>
          </div>
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 p-2.5 rounded-xl bg-gold-highlight text-primary-deep-navy cursor-pointer hover:bg-gold-highlight/90 transition shadow-md flex items-center justify-center">
            <ChevronsLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-primary-deep-navy text-light-cream p-10 rounded-3xl shadow-lg mb-10 flex flex-col md:flex-row justify-between items-center relative overflow-hidden z-10">
          
          {/* Navy Header Watermark (Inverse Light CIG Logo) */}
          <img src={cigLogoWatermark} alt="" className="absolute -top-16 -right-16 w-80 h-80 opacity-[0.03] grayscale invert pointer-events-none" />

          <div className="relative z-10">
            <p className="font-medium uppercase tracking-widest text-gold-highlight text-sm mb-1.5 flex items-center gap-2"><DollarSign className="text-accent-teal" /> Total Verified Dividends Earned</p>
            <h1 className="text-6xl font-black text-white tracking-tight text-shadow-teal-glow">K{totalDividendsEarned.toLocaleString()}</h1>
          </div>
          <div className="mt-8 md:mt-0 text-right space-y-1 relative z-10">
            <p className="text-light-cream/70 font-medium text-sm flex items-center gap-2 justify-end text-shadow-teal-glow">Events Received: <span className="font-black text-gold-highlight text-2xl tracking-tight text-shadow-teal-glow">{myDividends.length}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
          
          <div className="bg-white p-7 rounded-2xl shadow-sm border border-gold-highlight/10 hover:shadow-lg transition">
            <h3 className="text-2xl font-black text-primary-deep-navy mb-6 border-b border-gray-100 pb-2">Verified Payout History</h3>
            <ul className="space-y-3">
              {myDividends.length === 0 ? <p className="text-gray-500 text-sm italic">No entries yet.</p> : 
                myDividends.map(t => (
                  <li key={t.id} className="flex justify-between items-center text-sm bg-green-950 p-4.5 rounded-xl border border-accent-teal/10 relative overflow-hidden">
                    <span className="text-green-300 font-bold relative z-10">{new Date(t.timestamp).toLocaleDateString()}</span>
                    <span className="font-black text-green-200 text-lg relative z-10 text-shadow-teal-glow">+ K{parseFloat(t.amount).toLocaleString()}</span>
                  </li>
                ))
              }
            </ul>
          </div>

          {isAdmin ? (
            <div className="bg-primary-deep-navy p-7 rounded-2xl border border-gold-highlight border-l-gold-highlight border-l-4 shadow-xl text-white h-fit relative overflow-hidden group">
              
              {/* Box Watermark (Inverse Light CIG Logo) */}
              <img src={cigLogoWatermark} alt="" className="absolute -top-16 -right-16 w-80 h-80 opacity-[0.03] grayscale invert pointer-events-none" />

              <div className="flex items-center gap-2 mb-2 relative z-10">
                <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest text-shadow-teal-glow">checker: Admin Only</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-1 relative z-10">CIG Equity Declaration</h3>
              <p className="text-gold-highlight text-sm mb-6 font-medium relative z-10">Distribute club profits based on verified share equity.</p>
              
              <form onSubmit={handleDeclareDividend} className="flex flex-col gap-4 relative z-10">
                <input 
                  type="number" min="1" step="0.01" placeholder="Amount (K)"
                  value={profitAmount} 
                  disabled={isLoadingPayout} 
                  onChange={(e) => setProfitAmount(e.target.value)} 
                  className="w-full px-5 py-3.5 bg-primary-deep-navy border border-primary-deep-navy/80 rounded-lg text-white font-black focus:outline-none focus:ring-2 focus:ring-accent-teal shadow-inner text-shadow-teal-glow"
                />
                <button type="submit" disabled={isLoadingPayout} className="w-full bg-gold-highlight hover:bg-gold-highlight/90 text-primary-deep-navy font-black px-6 py-3.5 rounded-lg transition duration-200 shadow-md flex items-center justify-center gap-3">
                   {isLoadingPayout ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 'Execute Distribution'}
                </button>
              </form>
              
              {message && (
                <p className={`mt-5 text-sm font-medium p-4 rounded-lg relative z-10 text-shadow-teal-glow ${message.includes('❌') ? 'bg-red-950 text-red-200' : 'bg-green-950 text-green-200'}`}>
                  {message}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white p-7 rounded-2xl shadow-sm border border-gold-highlight/10 h-fit relative overflow-hidden">
               <CIGIcon className="absolute -top-10 -right-10 w-60 h-60 text-accent-teal/10 z-0" />
              <h3 className="text-2xl font-black text-primary-deep-navy mb-2 relative z-10">Verified Distribution</h3>
              <p className="text-gray-600 text-sm leading-relaxed relative z-10">
                calculated based on holding on declaration date. Shows only verified payouts.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default Dividends