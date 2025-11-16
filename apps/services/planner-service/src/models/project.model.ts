import { Document, Schema, model, Types } from "mongoose";

export interface IChannelModel extends Document {
    name: string
    userId: Types.ObjectId // reference to user can be populated
    ChannelDescription ?: string
}

const channelSchema = new Schema<IChannelModel>({
    name: { type: String, required: true },

    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    ChannelDescription : {
        type:String
    },
})

export const Channel = model<IChannelModel>("Channel", channelSchema);