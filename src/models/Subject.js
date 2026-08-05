import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Subject must belong to a class'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

if (mongoose.models && mongoose.models.Subject) {
  delete mongoose.models.Subject;
}

export default mongoose.model('Subject', SubjectSchema);
