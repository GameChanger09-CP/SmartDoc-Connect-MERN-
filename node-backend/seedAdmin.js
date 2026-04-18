const bcrypt = require('bcryptjs');
const { User } = require('./models');

const seedAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({
      $or: [
        { username: 'admin' },
        { email: 'prathamesh.gurav@walchandsangli.ac.in' }
      ]
    });

    if (existingAdmin) {
      console.log('🛡️  Admin user already exists. Skipping seed.');
      return; // Exit the function gracefully, DO NOT use process.exit() here
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminUser = await User.create({
      username: 'admin',
      email: 'prathamesh.gurav@walchandsangli.ac.in',
      password: hashedPassword,
      role: 'Main_Admin',
      kyc_status: 'Verified',
      gov_id: null,
      department: null
    });

    console.log('🎉 Admin created successfully');
    console.log('👤 Username:', adminUser.username);
    console.log('📧 Email:', adminUser.email);
    
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
  }
};

// Use CommonJS export instead of ES6 export
module.exports = seedAdmin;