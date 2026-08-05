import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  rollNo: {
    type: String,
    required: [true, 'Roll number is required'],
    trim: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  guardianPhone: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

if (mongoose.models && mongoose.models.Student) {
  delete mongoose.models.Student;
}

export default mongoose.model('Student', StudentSchema);
