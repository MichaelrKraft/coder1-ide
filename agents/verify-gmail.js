const nodemailer = require('nodemailer');

async function testGmail() {
  console.log('Testing Gmail authentication for poolkraftllc@gmail.com...\n');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'poolkraftllc@gmail.com',
      pass: 'abheoelkiptehyyb'
    }
  });

  try {
    await transporter.verify();
    console.log('✅ Gmail authentication successful!');
    
    // Send a test email
    console.log('\nSending test notification...');
    const info = await transporter.sendMail({
      from: 'poolkraftllc@gmail.com',
      to: 'support@callspot.ai',
      subject: '🎉 Coder1 Agent - Email Notifications Active!',
      text: 'This is a test email from your Coder1 autonomous agent. Email notifications are now working!',
      html: '<h2>🎉 Success!</h2><p>Email notifications are now active for your Coder1 autonomous agent!</p>'
    });
    
    console.log('✅ Test email sent!');
    console.log('📬 Check support@callspot.ai inbox');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGmail();
