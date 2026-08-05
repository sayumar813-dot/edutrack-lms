import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    default: '',
  },
  subjectsAssigned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

if (mongoose.models && mongoose.models.Teacher) {
  delete mongoose.models.Teacher;
}

export default mongoose.model('Teacher', TeacherSchema);
