import mongoose from "mongoose";

const { Schema } = mongoose;

export interface IJob extends mongoose.Document {
  source: string;
  companyId?: mongoose.Types.ObjectId;
  title: string;
  location?: string;
  employmentType?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  ctc?: string;
  applyUrl?: string;
  externalId?: string;
  rawHtml?: string;
  parsedAt?: Date;
  status: string;
  meta?: any;
  createdAt?: Date;
  postedAt?: Date;
  updatedAt?: Date;
}

const JobSchema = new Schema<IJob>(
  {
    source: String,
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    title: { type: String, required: true, index: true },
    location: String,
    employmentType: String,
    description: String,
    requirements: [String],
    responsibilities: [String],
    ctc: String,
    applyUrl: String,
    externalId: { type: String, index: true },
    rawHtml: String,
    parsedAt: Date,
    status: { type: String, default: "draft" },
    meta: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const Job = mongoose.model<IJob>("Job", JobSchema);
