import React, { useContext } from 'react'
import { assets, plans } from '../assets/assets'
import { AppContext } from '../context/AppContext';
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const BuyCredit = () => {

const {user, backendUrl, loadCreditsData,token,setShowLogin} = useContext(AppContext);

const navigate = useNavigate();

const initpay = async (order) => {
  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: order.currency,
    name: "Credits Payment",
    description: "Purchase Credits",
    receipt: order.receipt,
    order_id: order.id,
    handler: async (response) => {
      try {
        const { data } = await axios.post(
          backendUrl + '/api/users/verify-razor', // Changed from /api/user to /api/users
          { response }, 
          { headers: { token } }
        );
        if (data.success) {
          
          loadCreditsData();
          navigate('/');
          toast.success("Payment successful");
        } else {
          toast.error("Payment failed");
        }
      } catch (error) {
        console.error('Verification error:', error);
        toast.error("Payment verification failed");
      }
    },
    prefill: {
      name: user?.name,
      email: user?.email,
      contact: user?.phone,
    },
    theme: {
      color: "#3399cc",
    },
  };
  const rzp = new window.Razorpay(options);
  rzp.open();
}

const paymentRazorpay = async(planId) => {
  try {
    console.log('Starting payment for plan:', planId);
    if(!user) {
      setShowLogin(true);
      return;
    }

    console.log('Making request to create order');
    const { data } = await axios.post(
      backendUrl + '/api/users/pay-razor', 
      { planId }, 
      { headers: { token }}
    );
    console.log('Order creation response:', data);
    
    if(data.success){
      initpay(data.order);
    }
  }
  catch (error) {
    console.error('Error in payment initialization:', error);
    toast.error(error.message)
  }
}


  return (
    <motion.div 
    initial={{ opacity: .2, y: 100 }}
    transition={{ duration: 1 }}  
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    
    className='min-h[80vh] text-center pt-14 mb-10'>
      <button className='border border-gray-400 px-10 py-2 rounded-full mb-6'>Our Plans</button>
      <h1 className='text-center text-3xl font-medium mb-6 sm:mb-10'>Choose the plan</h1>

    <div className='flex flex-wrap justify-center gap-6 text-left'>
      {plans.map((item, index) => (
        <div key={index} className='bg-white drop-shadow-sm border rounded-lg py-12 px-8 text-gray-600 hover:scale-105 transition-all duration-500'>
          <img src={assets.logo_icon} width={40} alt="" />
          <p className='mt-3 mb-1 font-semibold'>{item.id}</p>
          <p className='text-sm'>{item.desc}</p>
          <p className='mt-6'><span className='text-3xl font-medium'>₹{item.price} </span>/ {item.credits}</p>
          <button onClick={() => paymentRazorpay(item.id)} className='w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52'>{user? 'Purchase' : 'Get Started'}</button>
        </div>

      ))}
    </div>

    </motion.div>
  )
}

export default BuyCredit