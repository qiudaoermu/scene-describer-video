// 数据库迁移脚本：将userId从ObjectId转换为String
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 连接MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    process.exit(1);
  }
};

// 定义旧的Schema（用于查询现有数据）
const OldVideoDescriptionSchema = new mongoose.Schema({
  videoId: String,
  videoTitle: String,
  videoUrl: String,
  userQuery: String,
  aiDescription: String,
  userId: mongoose.Schema.Types.ObjectId, // 旧的ObjectId类型
  userEmail: String,
  createdAt: Date,
  updatedAt: Date
});

const OldVideoDescription = mongoose.model('OldVideoDescription', OldVideoDescriptionSchema, 'videodescriptions');

// 迁移函数
const migrateUserIds = async () => {
  try {
    console.log('🔄 开始迁移userId字段...');
    
    // 查找所有包含ObjectId类型userId的文档
    const documents = await OldVideoDescription.find({
      userId: { $type: 'objectId' }
    });
    
    console.log(`📊 找到 ${documents.length} 个需要迁移的文档`);
    
    if (documents.length === 0) {
      console.log('✅ 没有需要迁移的文档');
      return;
    }
    
    // 批量更新文档
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const oldUserId = doc.userId;
      
      // 将ObjectId转换为字符串
      const newUserId = oldUserId.toString();
      
      // 更新文档
      await mongoose.connection.collection('videodescriptions').updateOne(
        { _id: doc._id },
        { 
          $set: { 
            userId: newUserId,
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`✅ 迁移文档 ${i + 1}/${documents.length}: ${doc._id} - userId: ${oldUserId} → ${newUserId}`);
    }
    
    console.log('🎉 所有文档迁移完成！');
    
  } catch (error) {
    console.error('❌ 迁移过程中出错:', error);
    throw error;
  }
};

// 验证迁移结果
const verifyMigration = async () => {
  try {
    console.log('🔍 验证迁移结果...');
    
    // 检查是否还有ObjectId类型的userId
    const remainingObjectIds = await mongoose.connection.collection('videodescriptions').countDocuments({
      userId: { $type: 'objectId' }
    });
    
    // 检查字符串类型的userId数量
    const stringUserIds = await mongoose.connection.collection('videodescriptions').countDocuments({
      userId: { $type: 'string' }
    });
    
    console.log(`📊 迁移结果:`);
    console.log(`   - ObjectId类型的userId: ${remainingObjectIds}`);
    console.log(`   - String类型的userId: ${stringUserIds}`);
    
    if (remainingObjectIds === 0) {
      console.log('✅ 迁移验证成功！所有userId都已转换为字符串类型');
    } else {
      console.log('⚠️  仍有ObjectId类型的userId需要处理');
    }
    
  } catch (error) {
    console.error('❌ 验证过程中出错:', error);
  }
};

// 主函数
const main = async () => {
  try {
    await connectDB();
    await migrateUserIds();
    await verifyMigration();
    
    console.log('🎉 迁移脚本执行完成！');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 迁移脚本执行失败:', error);
    process.exit(1);
  }
};

// 执行迁移
main();