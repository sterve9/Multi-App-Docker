# kie.ai API — Complete Reference

Use this as the source of truth when working with the kie.ai API in this project.

---

## Authentication

```
Authorization: Bearer <KIE_AI_API_KEY>
Content-Type: application/json
```

---

## Core Endpoints

| Purpose | Method | URL |
|---|---|---|
| Create task (all models) | POST | `https://api.kie.ai/api/v1/jobs/createTask` |
| Poll task status | GET | `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=<id>` |
| Upload file (binary) | POST | `https://api.kie.ai/api/file-stream-upload` |
| Upload file (base64) | POST | `https://api.kie.ai/api/file-base64-upload` |
| Upload file (URL) | POST | `https://api.kie.ai/api/file-url-upload` |
| Check credits | GET | `https://api.kie.ai/api/v1/chat/credit` |
| Get download link | POST | `https://api.kie.ai/api/v1/common/download-url` |

> **⚠️ DISCREPANCY IN CURRENT CODE** — `image.py` uses legacy endpoints:
> - Polls `GET /api/v1/jobs/detail` → should be `GET /api/v1/jobs/recordInfo`
> - Uploads to `POST /api/v1/file/upload` → should be `POST /api/file-stream-upload`
> - Reads `record["output"]["works"][0]["resource"]["resource"]` → should be `json.loads(record["resultJson"])["resultUrls"][0]`
> These legacy aliases may still work, but may cause silent failures.

---

## Task Creation Response (all models)

```json
{
  "code": 200,
  "msg": "success",
  "data": { "taskId": "task_kling-3.0_1765187774173" }
}
```

---

## Task Status Polling

`GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=<taskId>`

```json
{
  "code": 200,
  "data": {
    "taskId": "...",
    "state": "waiting|queuing|generating|success|fail",
    "resultJson": "{\"resultUrls\": [\"https://...\"]}",
    "failCode": "",
    "failMsg": "",
    "progress": 0
  }
}
```

**Extract result URL:**
```python
import json
result_data = json.loads(record["resultJson"])
url = result_data["resultUrls"][0]
```

---

## File Upload

```python
# Binary upload (multipart)
POST https://api.kie.ai/api/file-stream-upload
fields: file (binary), uploadPath (str), fileName (str optional)

# Response
{
  "success": true,
  "data": {
    "downloadUrl": "https://tempfile.redpandaai.co/...",
    "filePath": "...",
    "fileSize": 154832
  }
}
```
Files auto-deleted after **3 days**. Max 100MB.

---

## Video Models

### Kling 3.0 (current — used in premium format)
**Model**: `kling-3.0/video`
```json
{
  "model": "kling-3.0/video",
  "input": {
    "prompt": "description @element_name",
    "aspect_ratio": "16:9",
    "duration": "5",
    "mode": "std",
    "multi_shots": false,
    "sound": false,
    "kling_elements": [
      {
        "name": "couple_reference",
        "description": "Kofi and Ama, main characters",
        "element_input_urls": ["url1", "url2"]
      }
    ]
  }
}
```
- Resolutions: std→1280×720, pro→1920×1080 (for 16:9)
- Duration: 3–15s (string)
- kling_elements: 2–50 URLs, JPG/PNG, max 10MB each

### Kling 2.6 Text-to-Video
**Model**: `kling-2.6/text-to-video`
```json
{
  "input": { "prompt": "...", "sound": false, "aspect_ratio": "16:9", "duration": "5" }
}
```
Duration: "5" or "10" only.

### Kling 2.6 Image-to-Video
**Model**: `kling-2.6/image-to-video`
```json
{
  "input": { "prompt": "...", "image_urls": ["url"], "sound": false, "duration": "5" }
}
```

### Kling V2.1 Master (best quality)
**Model**: `kling/v2-1-master-text-to-video`
```json
{
  "input": { "prompt": "...", "duration": "5", "aspect_ratio": "16:9", "cfg_scale": 0.5 }
}
```

### Kling AI Avatar (lipsync)
**Model**: `kling/ai-avatar-standard`
```json
{
  "input": { "image_url": "...", "audio_url": "...", "prompt": "..." }
}
```
Audio: MP3/WAV/AAC/MP4/OGG, max 10MB

---

## Image Models

### Flux-2 Pro (closest to old Replicate Flux)
**Model**: `flux-2/pro-text-to-image`
```json
{
  "model": "flux-2/pro-text-to-image",
  "input": {
    "prompt": "...",
    "aspect_ratio": "16:9",
    "resolution": "1K"
  }
}
```
Aspect ratios: `1:1|4:3|3:4|16:9|9:16|3:2|2:3`
Resolutions: `1K` or `2K`

### Seedream v4 (ByteDance — very photorealistic)
**Model**: `bytedance/seedream-v4-text-to-image`
```json
{
  "model": "bytedance/seedream-v4-text-to-image",
  "input": {
    "prompt": "...",
    "image_size": "landscape_16_9",
    "image_resolution": "2K",
    "max_images": 1
  }
}
```
image_size options: `square|square_hd|portrait_4_3|portrait_3_2|portrait_16_9|landscape_4_3|landscape_3_2|landscape_16_9|landscape_21_9`

### Seedream 4.5
**Model**: `seedream/4.5-text-to-image`
```json
{
  "input": { "prompt": "...", "aspect_ratio": "16:9", "quality": "high" }
}
```
quality: `basic`=2K, `high`=4K

### Google Imagen4
**Model**: `google/imagen4`
```json
{
  "input": { "prompt": "...", "aspect_ratio": "16:9", "negative_prompt": "..." }
}
```

### GPT Image 1.5
**Model**: `gpt-image/1.5-text-to-image`
```json
{
  "input": { "prompt": "...", "aspect_ratio": "3:2", "quality": "high" }
}
```

---

## Error Codes

| Code | Meaning |
|---|---|
| 401 | Invalid API key |
| 402 | Insufficient credits |
| 422 | Validation error (wrong payload) |
| 429 | Rate limit (max 20 req/10s) |
| 455 | Service maintenance |
| 501 | Generation failed |

---

## Rate Limits & Data Retention

- Max **20 new requests / 10 seconds**
- Up to **100 concurrent tasks**
- Generated media: deleted after **14 days**
- Uploaded files: deleted after **3 days**
- Download links from `/download-url`: valid **20 minutes only**

---

## Recommended polling pattern

```python
for _ in range(120):        # max 10 min
    await asyncio.sleep(5)
    resp = await client.get(
        "https://api.kie.ai/api/v1/jobs/recordInfo",
        headers=headers,
        params={"taskId": task_id}
    )
    data = resp.json()["data"]
    if data["state"] == "success":
        url = json.loads(data["resultJson"])["resultUrls"][0]
        break
    elif data["state"] == "fail":
        raise Exception(data.get("failMsg"))
```
