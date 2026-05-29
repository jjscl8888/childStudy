import { Router } from 'express';
import { query, getClient, isPostgres } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.post('/upload', async (req, res) => {
  const client = await getClient();
  try {
    const userId = req.user.id;
    const { learningRecords, achievements, reviewItems, pathNodes, voiceSettings } = req.body;

    if (isPostgres()) {
      await client.query('BEGIN');
    }

    if (learningRecords && learningRecords.length > 0) {
      for (const record of learningRecords) {
        await client.query(
          `INSERT INTO learning_records (id, user_id, module, topic, action, score, stars_earned, duration, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT DO NOTHING`,
          [Date.now().toString() + Math.random().toString(36).slice(2), userId, record.module, record.topic, record.action, record.score, record.starsEarned, record.duration, record.createdAt]
        );
      }
    }

    if (achievements && achievements.length > 0) {
      for (const ach of achievements) {
        if (isPostgres()) {
          await client.query(
            `INSERT INTO achievements (id, user_id, code, name, description, icon, category, unlocked, unlocked_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (user_id, code) DO UPDATE SET unlocked = EXCLUDED.unlocked, unlocked_at = EXCLUDED.unlocked_at`,
            [Date.now().toString() + Math.random().toString(36).slice(2), userId, ach.code, ach.name, ach.description, ach.icon, ach.category, ach.unlocked, ach.unlockedAt || null]
          );
        } else {
          await client.query(
            `INSERT OR REPLACE INTO achievements (id, user_id, code, name, description, icon, category, unlocked, unlocked_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [Date.now().toString() + Math.random().toString(36).slice(2), userId, ach.code, ach.name, ach.description, ach.icon, ach.category, ach.unlocked ? 1 : 0, ach.unlockedAt || null]
          );
        }
      }
    }

    if (reviewItems && reviewItems.length > 0) {
      for (const item of reviewItems) {
        if (isPostgres()) {
          await client.query(
            `INSERT INTO review_items (id, user_id, module_id, item_id, level, next_review, last_review, review_count, ease_factor, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (user_id, module_id, item_id) DO UPDATE SET
               level = EXCLUDED.level,
               next_review = EXCLUDED.next_review,
               last_review = EXCLUDED.last_review,
               review_count = EXCLUDED.review_count,
               ease_factor = EXCLUDED.ease_factor`,
            [Date.now().toString() + Math.random().toString(36).slice(2), userId, item.moduleId, item.itemId, item.level, new Date(item.nextReview), item.lastReview ? new Date(item.lastReview) : null, item.reviewCount, item.easeFactor, new Date(item.createdAt)]
          );
        } else {
          await client.query(
            `INSERT OR REPLACE INTO review_items (id, user_id, module_id, item_id, level, next_review, last_review, review_count, ease_factor, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [Date.now().toString() + Math.random().toString(36).slice(2), userId, item.moduleId, item.itemId, item.level, item.nextReview, item.lastReview, item.reviewCount, item.easeFactor, item.createdAt]
          );
        }
      }
    }

    if (pathNodes && pathNodes.length > 0) {
      for (const node of pathNodes) {
        if (isPostgres()) {
          await client.query(
            `INSERT INTO path_nodes (id, user_id, module_id, item_id, order_num, status, stars, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (user_id, module_id, item_id) DO UPDATE SET
               status = EXCLUDED.status,
               stars = EXCLUDED.stars,
               completed_at = EXCLUDED.completed_at`,
            [Date.now().toString() + Math.random().toString(36).slice(2), userId, node.moduleId, node.itemId, node.order, node.status, node.stars, node.completedAt ? new Date(node.completedAt) : null]
          );
        } else {
          await client.query(
            `INSERT OR REPLACE INTO path_nodes (id, user_id, module_id, item_id, order_num, status, stars, completed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [Date.now().toString() + Math.random().toString(36).slice(2), userId, node.moduleId, node.itemId, node.order, node.status, node.stars, node.completedAt || null]
          );
        }
      }
    }

    if (voiceSettings) {
      const vs = voiceSettings;
      if (isPostgres()) {
        await client.query(
          `INSERT INTO voice_settings (user_id, rate, pitch, gender, tone, engine, role, edge_tts_voice, edge_tts_rate, edge_tts_pitch, edge_tts_volume, edge_tts_locale_filter, edge_tts_gender_filter)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO UPDATE SET
             rate = EXCLUDED.rate, pitch = EXCLUDED.pitch, gender = EXCLUDED.gender, tone = EXCLUDED.tone,
             engine = EXCLUDED.engine, role = EXCLUDED.role, edge_tts_voice = EXCLUDED.edge_tts_voice,
             edge_tts_rate = EXCLUDED.edge_tts_rate, edge_tts_pitch = EXCLUDED.edge_tts_pitch,
             edge_tts_volume = EXCLUDED.edge_tts_volume, edge_tts_locale_filter = EXCLUDED.edge_tts_locale_filter,
             edge_tts_gender_filter = EXCLUDED.edge_tts_gender_filter`,
          [userId, vs.rate, vs.pitch, vs.gender, vs.tone, vs.engine, vs.role, vs.edgeTtsVoice, vs.edgeTtsRate, vs.edgeTtsPitch, vs.edgeTtsVolume, vs.edgeTtsLocaleFilter, vs.edgeTtsGenderFilter]
        );
      } else {
        await client.query(
          `INSERT OR REPLACE INTO voice_settings (id, user_id, rate, pitch, gender, tone, engine, role, edge_tts_voice, edge_tts_rate, edge_tts_pitch, edge_tts_volume, edge_tts_locale_filter, edge_tts_gender_filter)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, vs.rate, vs.pitch, vs.gender, vs.tone, vs.engine, vs.role, vs.edgeTtsVoice, vs.edgeTtsRate, vs.edgeTtsPitch, vs.edgeTtsVolume, vs.edgeTtsLocaleFilter, vs.edgeTtsGenderFilter]
        );
      }
    }

    await client.query(
      'INSERT INTO sync_logs (id, user_id, action, record_count) VALUES ($1, $2, $3, $4)',
      [Date.now().toString() + Math.random().toString(36).slice(2), userId, 'upload', (learningRecords?.length || 0) + (reviewItems?.length || 0)]
    );

    if (isPostgres()) {
      await client.query('COMMIT');
    }

    res.json({ success: true, message: '数据同步成功' });
  } catch (error) {
    if (isPostgres()) {
      await client.query('ROLLBACK');
    }
    console.error('Sync upload error:', error);
    res.status(500).json({ error: '数据同步失败' });
  } finally {
    client.release();
  }
});

router.get('/download', async (req, res) => {
  try {
    const userId = req.user.id;

    const learningRecords = (await query(
      'SELECT module, topic, action, score, stars_earned as "starsEarned", duration, created_at as "createdAt" FROM learning_records WHERE user_id = $1 ORDER BY created_at',
      [userId]
    )).rows;

    const achievements = (await query(
      'SELECT code, name, description, icon, category, unlocked, unlocked_at as "unlockedAt" FROM achievements WHERE user_id = $1',
      [userId]
    )).rows;

    let reviewItems;
    if (isPostgres()) {
      reviewItems = (await query(
        `SELECT module_id as "moduleId", item_id as "itemId", level,
          EXTRACT(EPOCH FROM next_review) * 1000 as "nextReview",
          CASE WHEN last_review IS NOT NULL THEN EXTRACT(EPOCH FROM last_review) * 1000 ELSE NULL END as "lastReview",
          review_count as "reviewCount", ease_factor as "easeFactor",
          EXTRACT(EPOCH FROM created_at) * 1000 as "createdAt"
         FROM review_items WHERE user_id = $1`,
        [userId]
      )).rows;
    } else {
      reviewItems = (await query(
        `SELECT module_id as "moduleId", item_id as "itemId", level,
          next_review as "nextReview", last_review as "lastReview",
          review_count as "reviewCount", ease_factor as "easeFactor",
          created_at as "createdAt"
         FROM review_items WHERE user_id = $1`,
        [userId]
      )).rows;
    }

    let pathNodes;
    if (isPostgres()) {
      pathNodes = (await query(
        `SELECT module_id as "moduleId", item_id as "itemId", order_num as "order", status, stars,
          CASE WHEN completed_at IS NOT NULL THEN completed_at::text ELSE NULL END as "completedAt"
         FROM path_nodes WHERE user_id = $1 ORDER BY module_id, order_num`,
        [userId]
      )).rows;
    } else {
      pathNodes = (await query(
        `SELECT module_id as "moduleId", item_id as "itemId", order_num as "order", status, stars,
          completed_at as "completedAt"
         FROM path_nodes WHERE user_id = $1 ORDER BY module_id, order_num`,
        [userId]
      )).rows;
    }

    const voiceSettingsRow = (await query(
      `SELECT rate, pitch, gender, tone, engine, role, edge_tts_voice as "edgeTtsVoice",
        edge_tts_rate as "edgeTtsRate", edge_tts_pitch as "edgeTtsPitch",
        edge_tts_volume as "edgeTtsVolume", edge_tts_locale_filter as "edgeTtsLocaleFilter",
        edge_tts_gender_filter as "edgeTtsGenderFilter"
       FROM voice_settings WHERE user_id = $1`,
      [userId]
    )).rows[0] || null;

    await query(
      'INSERT INTO sync_logs (id, user_id, action, record_count) VALUES ($1, $2, $3, $4)',
      [Date.now().toString() + Math.random().toString(36).slice(2), userId, 'download', learningRecords.length + reviewItems.length]
    );

    res.json({
      success: true,
      data: {
        learningRecords,
        achievements,
        reviewItems,
        pathNodes,
        voiceSettings: voiceSettingsRow,
      },
    });
  } catch (error) {
    console.error('Sync download error:', error);
    res.status(500).json({ error: '数据下载失败' });
  }
});

export default router;
