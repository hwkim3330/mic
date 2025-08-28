# VelocityDRIVE-SP Control Center

## LAN9662 웹 기반 제어 인터페이스

Microchip LAN9662 이더넷 스위치를 브라우저에서 직접 제어할 수 있는 강력한 웹 인터페이스입니다.

## 🚀 주요 기능

### 통신 프로토콜
- **MUP1 (Microchip UART Protocol #1)** 완벽 지원
- **CoAP/CORECONF** (RFC7252) 프로토콜 구현
- **WebSerial API**를 통한 브라우저-시리얼 직접 통신
- **YANG/CBOR** 데이터 모델 지원 (RFC7951, RFC9254)

### 장치 제어
- **인터페이스 관리**: 포트 설정, 속도, 듀플렉스, 상태 모니터링
- **VLAN 구성**: IEEE 802.1Q VLAN 생성/수정/삭제
- **TSN 기능**: PTP, TAS, PSFP, FRER 지원

## 🔧 설치 및 실행

```bash
git clone https://github.com/hwkim3330/mic.git
cd mic
python3 -m http.server 8000
```

브라우저에서 http://localhost:8000 접속

## 📋 시스템 요구사항

- Chrome 89+ 또는 Edge 89+ (WebSerial API 지원)
- LAN9662 개발 보드

## 📚 MUP1 프로토콜 상세

### 프레임 구조
```
+--------+--------+--------+--------+--------+--------+
| SOF    | Type   | Seq    | Length | Payload | EOF    |
| 0x3E   | 1 byte | 1 byte | 2 bytes| N bytes | 0x3C   |
+--------+--------+--------+--------+--------+--------+
```

## 📄 라이선스

MIT License

## 🙏 감사의 말

- Microchip Technology Inc. - VelocityDRIVE-SP 플랫폼
