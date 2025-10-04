# ETF 가격 예측 시스템

TTM Squeeze Momentum과 Stochastic RSI 지표를 활용한 ETF 3개월 가격 예측 웹앱입니다.

## 🚀 주요 기능

- **실시간 ETF 데이터 로딩**: Yahoo Finance API를 통한 실시간 데이터 수집
- **기술적 지표 계산**: TTM Squeeze Momentum, Stochastic RSI, RSI 등
- **매매 신호 생성**: 지표 기반 자동 매수/매도 신호 생성
- **AI 예측**: Gemini API를 활용한 3개월 가격 예측
- **시각화**: Chart.js를 활용한 인터랙티브 차트
- **반응형 디자인**: 모바일/데스크톱 최적화

## 📊 기술적 지표

### TTM Squeeze Momentum (SQZMOM_LB)
- Bollinger Bands와 Keltner Channels의 교차점 감지
- 변동성 축소(Squeeze) 및 확대(Release) 시점 파악
- 모멘텀 방향성 측정

### Stochastic RSI
- RSI의 Stochastic 변형
- 과매수/과매도 구간 감지
- %K와 %D 라인의 교차점 분석

### 매매 신호 로직
- **강력한 매수**: SQZMOM 상승 전환 + Stoch RSI 과매도 반등 + Squeeze 해제
- **일반 매수**: 위 조건 중 2개 이상 만족
- **강력한 매도**: SQZMOM 하락 전환 + Stoch RSI 과매수 하락
- **일반 매도**: 위 조건 중 1개 이상 만족

## 🛠️ 설치 및 실행

### 1. 파일 다운로드
```bash
# 프로젝트 폴더로 이동
cd /Users/junsangdong/Desktop/vibe-1004-qqq-prediction

# 파일 확인
ls -la
# index.html, styles.css, script.js, README.md
```

### 2. Gemini API 키 설정
1. [Google AI Studio](https://makersuite.google.com/app/apikey)에서 API 키 발급
2. `script.js` 파일의 4번째 줄에서 API 키 설정:
```javascript
this.geminiApiKey = 'YOUR_GEMINI_API_KEY'; // 실제 API 키로 교체
```

### 3. 웹 서버 실행
```bash
# Python 3가 설치된 경우
python3 -m http.server 8000

# 또는 Node.js가 설치된 경우
npx http-server -p 8000

# 또는 Live Server 확장 프로그램 사용 (VS Code)
```

### 4. 브라우저에서 접속
```
http://localhost:8000
```

## 📱 사용법

1. **ETF 종목 코드 입력**: QQQ, SPY, VTI 등
2. **예측 시작 버튼 클릭**: 데이터 분석 및 예측 시작
3. **결과 확인**: 
   - 현재 시장 상태
   - 3개월 예측 결과 (낙관적/현실적/비관적 시나리오)
   - 기술적 분석 차트
   - AI 예측 분석

## 🎯 지원 ETF 종목

- **QQQ**: NASDAQ 100 ETF
- **SPY**: S&P 500 ETF  
- **VTI**: Total Stock Market ETF
- **IWM**: Russell 2000 ETF
- **EFA**: EAFE ETF
- **VEA**: Developed Markets ETF
- 기타 Yahoo Finance에서 지원하는 모든 ETF

## 📈 예측 시나리오

### 현실적 시나리오
- 현재 기술적 지표와 시장 동향을 종합한 가장 가능성 높은 예측
- 신뢰도: 50-70%

### 낙관적 시나리오
- 상승 요인이 모두 작용할 경우의 최고 상승 가능 가격
- 신뢰도: 30-50%

### 비관적 시나리오
- 하락 요인이 모두 작용할 경우의 최대 하락 가능 가격
- 신뢰도: 30-50%

## ⚠️ 주의사항

### 투자 위험 고지
- **이 시스템은 교육 및 연구 목적으로 제작되었습니다**
- 실제 투자에 사용하기 전에 충분한 검증이 필요합니다
- 과거 성과가 미래 수익을 보장하지 않습니다
- 투자 손실에 대한 책임은 사용자에게 있습니다

### 기술적 한계
- 인터넷 연결이 필요합니다
- Yahoo Finance API의 제한사항이 있을 수 있습니다
- Gemini API 사용량 제한이 있습니다
- 실시간 데이터 지연이 있을 수 있습니다

### 권장 사용법
- **백테스팅**: 과거 데이터로 전략 검증
- **리스크 관리**: 포지션 크기 제한 (1-2% 이내)
- **손절매**: 진입가 대비 0.5-1% 손실 시
- **익절**: 진입가 대비 1-2% 수익 시
- **다양화**: 여러 ETF에 분산 투자

## 🔧 커스터마이징

### 지표 파라미터 조정
`script.js` 파일에서 다음 값들을 조정할 수 있습니다:

```javascript
// TTM Squeeze Momentum 파라미터
calculateSqueezeMomentum(data, length = 20, mult = 2.0, lengthKc = 20, multKc = 1.5)

// Stochastic RSI 파라미터  
calculateStochasticRSI(data, kPeriod = 3, dPeriod = 3, rsiPeriod = 14, stochPeriod = 14)
```

### 신호 로직 수정
`generateTradingSignals()` 함수에서 매매 신호 조건을 수정할 수 있습니다.

### UI 스타일 변경
`styles.css` 파일에서 색상, 레이아웃 등을 커스터마이징할 수 있습니다.

## 📚 참고 자료

- [TTM Squeeze Momentum 지표 설명](https://www.tradingview.com/scripts/ttmsqueeze/)
- [Stochastic RSI 지표 설명](https://www.investopedia.com/terms/s/stochrsi.asp)
- [Yahoo Finance API 문서](https://query1.finance.yahoo.com/v8/finance/chart/)
- [Gemini API 문서](https://ai.google.dev/docs)

## 🤝 기여하기

버그 리포트, 기능 제안, 코드 개선 등은 언제든 환영합니다.

## 📄 라이선스

이 프로젝트는 교육 목적으로 제작되었으며, 상업적 사용 시 별도 문의가 필요합니다.

---

**면책 조항**: 이 도구는 교육 및 연구 목적으로만 사용되어야 하며, 실제 투자 결정에 대한 책임은 사용자에게 있습니다. 투자에는 항상 위험이 따르며, 과거 성과가 미래 결과를 보장하지 않습니다.
