# Legal Metrology ML Microservice — Deployment & API Guide

This standalone microservice provides computer vision, spatial OCR, declaration parsing, and deterministic compliance checks under the **Legal Metrology (Packaged Commodities) Rules, 2011**.

---

## 1. Local Development & Testing

### Prerequisites
- Python 3.10, 3.11, or 3.12
- System libraries: `libgl1`, `libglib2.0-0`, `libgomp1` (on Linux) or standard macOS libraries.

### Setup & Run
```bash
cd doca-ml-service

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --host 0.0.0.0 --port 7860 --reload
```

Interactive OpenAPI documentation is available at `http://localhost:7860/docs`.

---

## 2. Deployment to Hugging Face Spaces (Free 16GB RAM)

Hugging Face Spaces offers free 2 vCPU + 16 GB RAM Docker Spaces, ideal for PaddleOCR / RapidOCR.

### Step-by-Step Instructions:

1. **Create Space on Hugging Face:**
   - Go to [huggingface.co/new-space](https://huggingface.co/new-space).
   - Set **Space Name** (e.g. `doca-ml-service` or `legal-metrology-engine`).
   - Select **Space SDK**: Choose **Docker** -> **Blank**.
   - Set Space hardware to **CPU Basic (2 vCPU · 16 GB RAM · Free)**.
   - Visibility: **Public** or **Private** (Public allows seamless API calls from external backends).
   - Click **Create Space**.

2. **Initialize Git & Push from `doca-ml-service`:**
   ```bash
   cd /Users/sohamkarandikar/Documents/SIH-2026/DoCA/doca-ml-service

   # Initialize a git repository if not already connected
   git init
   git checkout -b main
   git remote add hf https://huggingface.co/spaces/<YOUR_USERNAME>/<YOUR_SPACE_NAME>

   # Stage all files
   git add .
   git commit -m "Deploy Legal Metrology ML Microservice to Hugging Face Spaces"

   # Push to Hugging Face (use HF Access Token as password)
   git push -u hf main --force
   ```

3. **Automatic Build & Warm-up:**
   - Hugging Face automatically detects `Dockerfile`.
   - Port `7860` is exposed and bound by default.
   - The build step warms the OCR model cache automatically so runtime queries experience zero model download delays.
   - Your endpoint will be live at:
     `https://<YOUR_USERNAME>-<YOUR_SPACE_NAME>.hf.space`

---

## 3. Deployment to Render (Standalone Docker Web Service)

Render provides managed container deployment with automated HTTPS certificates and environment binding.

### Step-by-Step Instructions:

1. **Push to GitHub / GitLab:**
   - Commit `doca-ml-service` into your repository or as a standalone repo.

2. **Create Web Service on Render:**
   - Log in to [dashboard.render.com](https://dashboard.render.com).
   - Click **New +** -> **Web Service**.
   - Connect your Git repository.
   - Configure the service:
     - **Name**: `doca-ml-service`
     - **Region**: Singapore (closest to India) or Oregon / Frankfurt
     - **Root Directory**: `doca-ml-service` (or leave blank if dedicated repo)
     - **Environment**: **Docker**
     - **Dockerfile Path**: `./Dockerfile` (or `doca-ml-service/Dockerfile`)
     - **Instance Type**: **Starter** (512MB–1GB RAM with RapidOCR fallback) or **Standard** (2GB+ for high-concurrency PaddleOCR)
   - **Environment Variables**:
     | Variable | Recommended Value | Notes |
     |---|---|---|
     | `DATABASE_URL` | `sqlite:///legal_metrology.db` | Optional persistent SQLite or Postgres pooler |
     | `PORT` | `10000` | Render injects this dynamically |

3. **Deploy:**
   - Click **Create Web Service**.
   - Render builds the Docker container, warms the OCR engine, and routes traffic through the assigned `$PORT`.
   - Health check path: `/health`.

---

## 4. API Specification & Request Examples

### 4.1. Health Check (`GET /health`)

Returns active engine, available fallback engines, and rules notification metadata.

**Request:**
```bash
curl -X GET "http://localhost:7860/health"
```

**Response:**
```json
{
  "status": "ok",
  "rules_version": "G.S.R. 202(E) dated 7th March, 2011",
  "rule_version": "G.S.R. 202(E) dated 7th March, 2011",
  "rules_notification": "G.S.R. 202(E) dated 7th March, 2011",
  "available_engines": [
    "RapidOCR",
    "EasyOCR"
  ],
  "available_ocr_engines": [
    "RapidOCR",
    "EasyOCR"
  ],
  "active_ocr_engine": "RapidOCR",
  "service": "doca-ml-service",
  "schema_file": "data2.json",
  "database": "sqlite:////app/legal_metrology.db"
}
```

---

### 4.2. Predict by Image URL (`POST /predict`)

Accepts a JSON payload with an image URL (e.g. Supabase Storage, S3 presigned URL, or public CDN).

**Request:**
```bash
curl -X POST "http://localhost:7860/predict" \
     -H "Content-Type: application/json" \
     -d '{
       "image_url": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600",
       "category": "food_and_beverages",
       "pdp_area_cm2": 200.0,
       "auto_pdp": true
     }'
```

**Response Structure:**
```json
{
  "inspection_id": "INSP-7B1A4C2E",
  "status": "COMPLIANT",
  "category": "food_and_beverages",
  "category_inferred": false,
  "total_violations": 0,
  "penalty": null,
  "warnings": [],
  "computed": {
    "computed_usp": {
      "mrp_inr": 20.0,
      "net_qty_value": 52.0,
      "usp_per_g": 0.3846,
      "usp_per_kg": 384.62,
      "usp_display": "₹0.38 per g (₹384.62 per kg)",
      "formula": "USP = MRP ÷ Net Quantity"
    },
    "pdp_estimation": {
      "estimated_cm2": 194.5,
      "ratio": 0.742,
      "confidence": "high",
      "method": "edge_contour_scaling"
    }
  },
  "mapped_fields": {
    "mrp": {
      "value": "MRP Rs. 20.00",
      "has_inclusive_taxes": true
    },
    "net_quantity": {
      "value": "Net Qty: 52g"
    },
    "mfg_date": {
      "value": "Pkd: 05/2026"
    },
    "expiry_or_best_before": {
      "value": "Best Before 6 Months from Packaging"
    },
    "generic_name": {
      "value": "Potato Chips"
    },
    "veg_nonveg_symbol": {
      "value": "Vegetarian - Green Dot (HSV+contour)",
      "visual": true,
      "geometry": true
    },
    "gtin_barcode": {
      "value": "8901491001137",
      "ean13_valid": true
    }
  },
  "violations": [],
  "passed_checks": [
    "Mandatory field 'mrp' present.",
    "Format check passed for 'mrp'.",
    "Mandatory field 'net_quantity' present.",
    "Format check passed for 'net_quantity'.",
    "Font height (2.4mm) meets minimum required (2.0mm) for PDP 200.0cm².",
    "GTIN barcode decoded: 8901491001137 (EAN-13 valid: true)"
  ],
  "spatial_metrics": {
    "total_text_blocks": 18,
    "measured_min_font_height_mm": 1.4,
    "measured_max_font_height_mm": 3.8,
    "average_font_height_mm": 2.6,
    "avg_confidence": 0.94
  },
  "quality_signals": {
    "gate": "PASS",
    "overall_score": 0.89,
    "blur": {"status": "sharp", "score": 1.0, "lap_var": 320.4},
    "glare": {"status": "no_glare", "score": 1.0, "ratio": 0.008},
    "resolution": {"status": "high", "score": 1.0, "pixels": 1200000}
  },
  "effective_pdp_cm2": 200.0,
  "ocr_engine_used": "RapidOCR",
  "rule_version": "G.S.R. 202(E) dated 7th March, 2011"
}
```

---

### 4.2.1. Predict by Multipart File Upload (`POST /predict`)

Accepts direct multipart image file upload:

**Request:**
```bash
curl -X POST "http://localhost:7860/predict" \
     -F "file=@/path/to/sample_packet.jpg" \
     -F "category=food_and_beverages" \
     -F "pdp_area_cm2=200.0" \
     -F "auto_pdp=true"
```

---

### 4.3. Multipart File Inspection (`POST /api/v1/inspect`)

Matches the officer mobile app contract from `api/main.py`. Performs legal metrology verification and records an audit log in SQLite.

**Request:**
```bash
curl -X POST "http://localhost:7860/api/v1/inspect" \
     -F "file=@/path/to/sample_packet.jpg" \
     -F "category=food_and_beverages" \
     -F "pdp_area_cm2=250.0" \
     -F "auto_pdp=true" \
     -F 'product_info={"category":"food_and_beverages","listing_title":"Lays 52g"}'
```

**Response:**
```json
{
  "inspection_id": "INSP-55E81AC7",
  "status": "NON_COMPLIANT",
  "category": "food_and_beverages",
  "category_inferred": false,
  "total_violations": 2,
  "penalty": {
    "section": "Section 36(1) of Legal Metrology Act, 2009",
    "first_offence_max_inr": 25000,
    "second_offence_max_inr": 50000,
    "subsequent_offence_max_inr": 100000,
    "imprisonment_subsequent": "Up to 1 year or fine or both",
    "cognizable": false,
    "compoundable": true
  },
  "warnings": [],
  "computed": {
    "computed_usp": {
      "mrp_inr": 50.0,
      "net_qty_value": 100.0,
      "usp_per_g": 0.5,
      "usp_per_kg": 500.0,
      "usp_display": "₹0.50 per g (₹500.00 per kg)"
    }
  },
  "mapped_fields": {
    "generic_name": {"value": "Biscuits"},
    "mrp": {"value": "MRP Rs. 50.00", "has_inclusive_taxes": true},
    "net_quantity": {"value": "Net Weight: 100 g"},
    "unit_sale_price": {"value": "USP: Rs. 0.50 / g"},
    "mfg_date": {"value": "01/2026"},
    "consumer_care": {"value": "1800-111-222"}
  },
  "violations": [
    {
      "rule": "Rule 6 - Mandatory Declaration Missing",
      "field": "expiry_or_best_before",
      "severity": "CRITICAL",
      "section": "Rule 6(1)(d) & FSSAI Regulations",
      "message": "Mandatory field 'expiry_or_best_before' is missing for category 'food_and_beverages'."
    },
    {
      "rule": "Rule 6 - Mandatory Declaration Missing",
      "field": "veg_nonveg_symbol",
      "severity": "CRITICAL",
      "section": "FSSAI (Packaging and Labelling) Regulations, 2011",
      "message": "Mandatory field 'veg_nonveg_symbol' is missing for category 'food_and_beverages'."
    }
  ],
  "passed_checks": [
    "Mandatory field 'generic_name' present.",
    "Mandatory field 'mrp' present.",
    "Mandatory field 'net_quantity' present.",
    "Mandatory field 'unit_sale_price' present.",
    "Mandatory field 'mfg_date' present.",
    "Mandatory field 'consumer_care' present."
  ],
  "spatial_metrics": {
    "total_text_blocks": 6,
    "measured_min_font_height_mm": 2.2,
    "measured_max_font_height_mm": 4.1,
    "average_font_height_mm": 3.15,
    "avg_confidence": 0.98
  },
  "quality_signals": {
    "gate": "PASS",
    "overall_score": 0.95
  },
  "effective_pdp_cm2": 250.0,
  "rule_version": "G.S.R. 202(E) dated 7th March, 2011"
}
```
