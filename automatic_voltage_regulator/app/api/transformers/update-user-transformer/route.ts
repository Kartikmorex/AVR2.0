import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformers';

export async function POST(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
  try {
    const body = await req.json();
    const { deviceId, upperVoltage, lowerVoltage, tapLimitMin, tapLimitMax, minDelay, ratedCurrent, overCurrentLimit, mode, masterFollowerConfig, threshold } = body;
    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'deviceId is required' }, { status: 400 });
    }
    const updateFields: Record<string, any> = {};
    if (upperVoltage !== undefined) updateFields.upperVoltage = upperVoltage;
    if (lowerVoltage !== undefined) updateFields.lowerVoltage = lowerVoltage;
    if (tapLimitMin !== undefined) updateFields.tapLimitMin = tapLimitMin;
    if (tapLimitMax !== undefined) updateFields.tapLimitMax = tapLimitMax;
    if (minDelay !== undefined) updateFields.minDelay = minDelay;
    if (ratedCurrent !== undefined) {
      updateFields['currentRating.ratedCurrent'] = ratedCurrent;
    }
    if (overCurrentLimit !== undefined) {
      updateFields['currentRating.overCurrentLimit'] = overCurrentLimit;
    }
    if (mode !== undefined) updateFields.mode = mode;
    if (threshold !== undefined) updateFields.threshold = threshold;
    if (masterFollowerConfig && typeof masterFollowerConfig === 'object') {
      const { master, followers } = masterFollowerConfig;
      if (!master) {
        return NextResponse.json({ success: false, error: 'master is required in masterFollowerConfig' }, { status: 400 });
      }
      await client.connect();
      const db = client.db(DB_NAME);
      const collection = db.collection(COLLECTION);
      // Set all to Individual and masterName to '-' first
      await collection.updateMany({}, { $set: { type: 'Individual', masterName: '-' } });
      // Set master
      await collection.updateOne({ deviceId: master }, { $set: { type: 'Master', masterName: '-' } });
      // Set followers
      if (Array.isArray(followers)) {
        for (const followerId of followers) {
          await collection.updateOne(
            { deviceId: followerId },
            { $set: { type: 'Follower', masterName: master } }
          );
        }
      }
      await client.close();
      return NextResponse.json({ success: true });
    }
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    console.log("API update-user-transformer deviceId:", deviceId, typeof deviceId);
    // Fetch old transformer before update
    const oldTransformer = await collection.findOne({ deviceId: String(deviceId) });
    const updateResult = await collection.updateOne(
      { deviceId: String(deviceId) },
      { $set: updateFields }
    );
    if (updateResult.matchedCount === 0) {
    await client.close();
      return NextResponse.json({ success: false, error: 'Transformer not found' }, { status: 404 });
    }
    const updatedDoc = await collection.findOne({ deviceId: String(deviceId) });
    // Log setting changes in history collection
    const history = db.collection('history');
    const deviceName = updatedDoc?.deviceName || updatedDoc?.name || deviceId;
    const now = new Date().toISOString();
    // For each field, if it was updated and value changed, log it
    const logSettingChange = async (settingType: string, oldValue: any, newValue: any) => {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        await history.insertOne({
          deviceId,
          deviceName,
          action: 'setting-change',
          settingType,
          oldValue,
          newValue,
          timestamp: now,
        });
      }
    };
    if (upperVoltage !== undefined) await logSettingChange('Upper Voltage Limit', oldTransformer?.upperVoltage, updatedDoc?.upperVoltage);
    if (lowerVoltage !== undefined) await logSettingChange('Lower Voltage Limit', oldTransformer?.lowerVoltage, updatedDoc?.lowerVoltage);
    if (tapLimitMin !== undefined) await logSettingChange('Minimum Tap Position', oldTransformer?.tapLimitMin, updatedDoc?.tapLimitMin);
    if (tapLimitMax !== undefined) await logSettingChange('Maximum Tap Position', oldTransformer?.tapLimitMax, updatedDoc?.tapLimitMax);
    if (minDelay !== undefined) await logSettingChange('Minimum Command Delay (seconds)', oldTransformer?.minDelay, updatedDoc?.minDelay);
    if (ratedCurrent !== undefined) await logSettingChange('Rated Current (A)', oldTransformer?.currentRating?.ratedCurrent, updatedDoc?.currentRating?.ratedCurrent);
    if (overCurrentLimit !== undefined) await logSettingChange('Overcurrent Limit (A)', oldTransformer?.currentRating?.overCurrentLimit, updatedDoc?.currentRating?.overCurrentLimit);
    if (mode !== undefined) await logSettingChange('Operation Mode', oldTransformer?.mode, updatedDoc?.mode);
    if (threshold !== undefined) await logSettingChange('Threshold (%)', oldTransformer?.threshold, updatedDoc?.threshold);
    await client.close();
    return NextResponse.json({ success: true, transformer: updatedDoc });
  } catch (err: any) {
    await client.close();
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
} 