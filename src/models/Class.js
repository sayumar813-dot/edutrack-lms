import mongoose from 'mongoose';

const ClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Clear cached Mongoose model in Next.js dev server to enforce latest schema ref
if (mongoose.models && mongoose.models.Class) {
  delete mongoose.models.Class;
}

export default mongoose.model('Class', ClassSchema);
