const express = require('express');
const router = express.Router();

/**
 * GET /api/videos
 * 获取所有视频列表
 */
router.get('/', (req, res) => {
  try {
    const videos = req.videoManager.getAllVideos();
    res.json({
      success: true,
      data: videos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/videos/:id
 * 获取单个视频信息
 */
router.get('/:id', (req, res) => {
  try {
    const video = req.videoManager.getVideoById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: '视频不存在'
      });
    }

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/videos/:id
 * 删除视频
 */
router.delete('/:id', (req, res) => {
  try {
    const success = req.videoManager.deleteVideo(req.params.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '视频不存在'
      });
    }

    res.json({
      success: true,
      message: '视频删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

