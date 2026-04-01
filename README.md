### AI-Powered Automated Traffic Violation Detection
**Presented by:** Team DetectX

---

## 📌 Problem Statement

Traditional traffic enforcement in India relies on police personnel standing on roads to catch violations like riding without helmets or triple riding. This creates several serious problems:

- 😰 People **panic** when they see police and take wrong routes to avoid them
- 📹 Government-installed **CCTV cameras go unused** due to lack of manpower and time
- ⚠️ Lives are lost due to both violations and the enforcement process itself

---

## 💡 Our Solution

An AI-powered system that uses existing CCTV infrastructure to **automatically detect traffic violations** and generate fines — without any police presence on the road.

> "Let the cameras do the policing."

The system detects:
- 🪖 Riders with **no helmet**
- 👥 **Triple riding** (3 or more people on a bike)
- 🔢 **Number plates** — including damaged/broken ones via fallback logic

All violations are automatically logged with a timestamp, photo evidence, and fine amount — exported to a clean **Excel report** for police records.

---

## 🧠 How It Works

```
CCTV / Image Input
       │
       ▼
┌─────────────────────┐
│  Face Detection     │  ← OpenCV Haar Cascade
│  (find riders)      │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Helmet Detection   │  ← Skin tone + hair + solid region analysis
│  above head region  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Person Count       │  ← MediaPipe Pose Estimation
│  on the bike        │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Number Plate       │  ← Contour detection + EasyOCR
│  Detection & OCR    │    Indian format: XX XX XX XXXX
└────────┬────────────┘
         │
     Plate broken?
      YES │         NO
         ▼           ▼
  Try back image   Use plate
  or video scan    directly
         │
         ▼
┌─────────────────────┐
│  Fine Calculation   │  ← No Helmet: ₹1,000
│  & Violation Log    │    Triple Riding: ₹2,000
└────────┬────────────┘
         │
         ▼
  Excel Report + Annotated Image Saved
```

---

## ⚙️ Tech Stack

| Component | Technology |
|---|---|
| Language | Python 3.10+ |
| Face Detection | OpenCV (Haar Cascade) |
| Pose / Person Count | MediaPipe Pose |
| Helmet Detection | OpenCV HSV analysis + edge heuristics |
| Number Plate OCR | EasyOCR |
| Plate Region Detection | OpenCV contour detection |
| Report Generation | openpyxl (Excel) |
| Input Formats | Image (JPG/PNG), Video (MP4), Live Camera |

---


## 📦 Installation

### Step 1 — Make sure Python is installed
Download Python 3.10 from https://python.org

### Step 2 — Install all dependencies
```bash
pip install -r requirements.txt
```
> ⏳ First run takes a few minutes — EasyOCR downloads language models automatically.

### Step 3 — You're ready!

---

## 🚀 How to Run

### Easiest way (interactive menu):
```bash
python run.py
```
This gives you a simple numbered menu to choose your mode.

---

### Direct commands:

#### Process a single image:
```bash
python detector.py image images/bike1.jpg
```

#### Process single image with front + back pair (broken plate fallback):
```bash
python detector.py image images/bike1_front.jpg images/bike1_back.jpg
```

#### Process entire folder of images (batch mode):
```bash
python detector.py folder images/
```

#### Batch folder + video fallback for broken plates:
```bash
python detector.py folder images/ cctv_recording.mp4
```

#### Live CCTV camera:
```bash
python detector.py live
```

#### Generate Excel report from existing log:
```bash
python excel_report.py
```

---

## 🖼️ Image Naming Convention (for auto front/back pairing)

Name your images like this and the system automatically pairs them:

```
bike1_front.jpg   ← scanned first
bike1_back.jpg    ← used automatically if front plate is broken/unreadable

bike2_front.jpg
bike2_back.jpg
```

If you just have single images, any filename works:
```
violation1.jpg
violation2.jpg
```

---

## 🔢 Number Plate Format

The system validates and reads standard Indian number plate format:

**Example:**
```
AP  XX  AB  XXXX
│   │   │   │
│   │   │   └── 4-digit serial number
│   │   └────── 1-2 letter series code
│   └────────── 2-digit district code
└────────────── 2-letter state code
```

**Accepted formats:** - Samples
- `AP XX AB XXXX` (with spaces)
- `APXXABXXXX` (without spaces)
- `TN XX XX XXXX` (any state)

---

## 🪖 Helmet Detection Logic

The AI checks the region **above each detected face**:

| Signal | No Helmet | Helmet |
|---|---|---|
| Skin tone ratio | > 30% skin = no helmet | Low skin |
| Hair detection | Dark flat region = bare head | Not dark flat |
| Solid region | Not present | Uniform solid shape |
| Default | **Assumes NO HELMET** (safer) | Only if clearly detected |

> The system defaults to "no helmet" when uncertain — better for enforcement.

---

## 💰 Fine Structure

| Violation | Fine Amount | Legal Section |
|---|---|---|
| Riding without helmet | ₹1,000 | Motor Vehicles Act — Section 129 |
| Triple riding (3+ on bike) | ₹1,000 | Motor Vehicles Act — Section 128 |
| Both violations together | ₹2,000 | Section 128 + 129 |

---

## 📊 Excel Report — 4 Sheets

When you run `python excel_report.py`, it generates a fully formatted Excel file:

| Sheet | Contents |
|---|---|
| **Summary** | KPI cards — total violations, no helmet count, triple riding count, total fine collected |
| **Violation Records** | Complete color-coded table with plate number, damage status, violation type, fine, location, image filename |
| **Analytics** | Bar chart + Pie chart of violation breakdown |
| **Fine Structure** | Legal reference table with MV Act sections |

---

## 📸 Output Example

After processing, each image gets annotated and saved:

```
[PROCESSED] bike1.jpg | Plate: TN 09 BT 9721 | Violations: ['NO_HELMET'] | Fine: ₹1000
  ⚠️  VIOLATION LOGGED → violations/log.json
```

Annotated image shows:
- 🔴 Red box around face + "NO HELMET!" label
- 🟡 Yellow box around number plate with plate text
- 🔵 Blue bar at bottom showing violation + fine amount
- 🟢 Green skeleton overlay for pose detection

---

## 🔮 Future Scope

| Feature | Description |
|---|---|
| RTO Database Link | Auto-fetch owner name, address, contact from vehicle registration |
| WhatsApp / SMS Alert | Send fine notice directly to registered vehicle owner |
| GPS Hotspot Map | Map showing violation-prone zones across Anantapur district |
| Night Vision Support | IR / thermal camera integration for 24/7 monitoring |
| Web Dashboard | Live monitoring dashboard for police control room |
| Speed Detection | Add vehicle speed detection using frame-by-frame tracking |
| Wrong Side Riding | Detect bikes going against traffic flow |

---

## 👮 Impact

- ✅ Reduces need for police on roads → **less panic, safer roads**
- ✅ Eliminates target-driven enforcement → **no accidental harm**
- ✅ Uses existing CCTV infrastructure → **zero additional hardware cost**
- ✅ 24/7 automated monitoring → **no shift limitations**
- ✅ Creates awareness of AI in government → **people follow rules voluntarily**

---

**Thankyou Team DetectX**
-->Sandra Prem Chand (L)
-->Muttukuri Dileep Muni Kumar
