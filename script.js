// ETF 가격 예측 시스템
class ETFPredictor {
    constructor() {
        this.geminiApiKey = 'AIzaSyAeqCGu4pBP5NpPzqcvEGnbLc4Mf3Mvdsc';
        this.charts = {};
        this.currentData = null;
    }

    // TTM Squeeze Momentum 계산
    calculateSqueezeMomentum(data, length = 20, mult = 2.0, lengthKc = 20, multKc = 1.5) {
        const high = data.map(d => d.high);
        const low = data.map(d => d.low);
        const close = data.map(d => d.close);
        
        // ATR 계산
        const atr = this.calculateATR(high, low, close, length);
        
        // Bollinger Bands
        const bbMiddle = this.sma(close, length);
        const bbStd = this.rollingStd(close, length);
        const bbUpper = bbMiddle.map((val, i) => val + (bbStd[i] * mult));
        const bbLower = bbMiddle.map((val, i) => val - (bbStd[i] * mult));
        
        // Keltner Channels
        const kcMiddle = this.sma(close, lengthKc);
        const kcUpper = kcMiddle.map((val, i) => val + (atr[i] * multKc));
        const kcLower = kcMiddle.map((val, i) => val - (atr[i] * multKc));
        
        // Squeeze 감지
        const squeezeOn = bbLower.map((val, i) => val > kcLower[i] && bbUpper[i] < kcUpper[i]);
        const squeezeOff = bbLower.map((val, i) => val <= kcLower[i] || bbUpper[i] >= kcUpper[i]);
        
        // Momentum 계산
        const highest = this.rollingMax(high, lengthKc);
        const lowest = this.rollingMin(low, lengthKc);
        const avg = highest.map((val, i) => (val + lowest[i]) / 2);
        const mom = close.map((val, i) => val - avg[i]);
        
        // Squeeze Momentum 값
        const squeezeMomentum = mom.map((val, i) => squeezeOn[i] ? val : 0);
        
        return {
            sqzmom: squeezeMomentum,
            squeezeOn: squeezeOn,
            squeezeOff: squeezeOff
        };
    }

    // Stochastic RSI 계산
    calculateStochasticRSI(data, kPeriod = 3, dPeriod = 3, rsiPeriod = 14, stochPeriod = 14) {
        const close = data.map(d => d.close);
        
        // RSI 계산
        const rsi = this.calculateRSI(close, rsiPeriod);
        
        // Stochastic RSI 계산
        const rsiMin = this.rollingMin(rsi, stochPeriod);
        const rsiMax = this.rollingMax(rsi, stochPeriod);
        const stochRsi = rsi.map((val, i) => {
            const range = rsiMax[i] - rsiMin[i];
            return range > 0 ? 100 * (val - rsiMin[i]) / range : 50;
        });
        
        // %K와 %D 계산
        const stochRsiK = this.sma(stochRsi, kPeriod);
        const stochRsiD = this.sma(stochRsiK, dPeriod);
        
        return {
            stochRsiK: stochRsiK,
            stochRsiD: stochRsiD,
            rsi: rsi
        };
    }

    // RSI 계산
    calculateRSI(prices, period = 14) {
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }
        
        const avgGains = this.sma(gains, period);
        const avgLosses = this.sma(losses, period);
        
        const rsi = avgGains.map((gain, i) => {
            const rs = avgLosses[i] > 0 ? gain / avgLosses[i] : 100;
            return 100 - (100 / (1 + rs));
        });
        
        return [0, ...rsi]; // 첫 번째 값은 0으로 패딩
    }

    // ATR 계산
    calculateATR(high, low, close, period = 14) {
        const trueRanges = [];
        
        for (let i = 1; i < high.length; i++) {
            const tr1 = high[i] - low[i];
            const tr2 = Math.abs(high[i] - close[i - 1]);
            const tr3 = Math.abs(low[i] - close[i - 1]);
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        return [0, ...this.sma(trueRanges, period)]; // 첫 번째 값은 0으로 패딩
    }

    // 단순 이동평균
    sma(data, period) {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / period);
        }
        return result;
    }

    // 롤링 표준편차
    rollingStd(data, period) {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            const slice = data.slice(i - period + 1, i + 1);
            const mean = slice.reduce((a, b) => a + b, 0) / period;
            const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
            result.push(Math.sqrt(variance));
        }
        return result;
    }

    // 롤링 최대값
    rollingMax(data, period) {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            result.push(Math.max(...data.slice(i - period + 1, i + 1)));
        }
        return result;
    }

    // 롤링 최소값
    rollingMin(data, period) {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            result.push(Math.min(...data.slice(i - period + 1, i + 1)));
        }
        return result;
    }

    // 매매 신호 생성
    generateTradingSignals(data) {
        const signals = new Array(data.length).fill(0);
        const signalStrength = new Array(data.length).fill(0);
        
        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const previous = data[i - 1];
            
            // 매수 신호 조건
            const sqzmomBullish = current.sqzmom > 0 && previous.sqzmom <= 0;
            const stochOversoldBounce = current.stochRsiK > current.stochRsiD && 
                                      previous.stochRsiK <= previous.stochRsiD && 
                                      current.stochRsiK < 30;
            const squeezeRelease = current.squeezeOff && previous.squeezeOn;
            
            // 매도 신호 조건
            const sqzmomBearish = current.sqzmom < 0 && previous.sqzmom >= 0;
            const stochOverboughtFall = current.stochRsiK < current.stochRsiD && 
                                      previous.stochRsiK >= previous.stochRsiD && 
                                      current.stochRsiK > 70;
            
            // 강력한 매수 신호
            if (sqzmomBullish && stochOversoldBounce && squeezeRelease) {
                signals[i] = 2;
                signalStrength[i] = 3;
            }
            // 일반 매수 신호
            else if ((sqzmomBullish && stochOversoldBounce) || 
                    (sqzmomBullish && squeezeRelease) || 
                    (stochOversoldBounce && squeezeRelease)) {
                signals[i] = 1;
                signalStrength[i] = 2;
            }
            // 강력한 매도 신호
            else if (sqzmomBearish && stochOverboughtFall) {
                signals[i] = -2;
                signalStrength[i] = 3;
            }
            // 일반 매도 신호
            else if (sqzmomBearish || stochOverboughtFall) {
                signals[i] = -1;
                signalStrength[i] = 2;
            }
        }
        
        return { signals, signalStrength };
    }

    // ETF 데이터 로딩
    async loadETFData(symbol, period = '5d', interval = '1m') {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (5 * 24 * 60 * 60 * 1000)); // 5일 전
            
            // CORS 프록시를 사용하여 Yahoo Finance API 호출
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${Math.floor(startDate.getTime() / 1000)}&period2=${Math.floor(endDate.getTime() / 1000)}&interval=${interval}&includePrePost=true&events=div%2Csplit`;
            
            const response = await fetch(proxyUrl + encodeURIComponent(yahooUrl));
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('No data available for this symbol');
            }
            
            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const quotes = result.indicators.quote[0];
            
            const processedData = timestamps.map((timestamp, index) => ({
                timestamp: new Date(timestamp * 1000),
                open: quotes.open[index],
                high: quotes.high[index],
                low: quotes.low[index],
                close: quotes.close[index],
                volume: quotes.volume[index]
            })).filter(d => d.close !== null && d.open !== null && d.high !== null && d.low !== null);
            
            if (processedData.length === 0) {
                throw new Error('No valid data points found');
            }
            
            return processedData;
        } catch (error) {
            console.error('Error loading ETF data:', error);
            // 대체 데이터 소스 시도
            return this.loadFallbackData(symbol);
        }
    }

    // 대체 데이터 로딩 (모의 데이터)
    async loadFallbackData(symbol) {
        console.log('Using fallback data for', symbol);
        const now = new Date();
        const data = [];
        
        // 최근 5일간의 모의 데이터 생성
        for (let i = 0; i < 720; i++) { // 5일 * 24시간 * 6 (10분 간격)
            const timestamp = new Date(now.getTime() - (i * 10 * 60 * 1000));
            const basePrice = 400 + Math.sin(i * 0.01) * 20; // 기본 가격 변동
            const noise = (Math.random() - 0.5) * 5; // 노이즈 추가
            
            data.push({
                timestamp: timestamp,
                open: basePrice + noise,
                high: basePrice + noise + Math.random() * 2,
                low: basePrice + noise - Math.random() * 2,
                close: basePrice + noise + (Math.random() - 0.5) * 1,
                volume: Math.floor(Math.random() * 1000000) + 100000
            });
        }
        
        return data.reverse(); // 시간순으로 정렬
    }

    // Gemini API를 통한 예측
    async getGeminiPrediction(symbol, currentData, technicalAnalysis) {
        try {
            const prompt = `
ETF ${symbol}의 현재 기술적 분석 결과를 바탕으로 향후 3개월 가격 예측을 해주세요.

현재 데이터:
- 현재가: $${currentData.close.toFixed(2)}
- SQZMOM: ${currentData.sqzmom.toFixed(4)}
- Stochastic RSI K: ${currentData.stochRsiK.toFixed(2)}
- Stochastic RSI D: ${currentData.stochRsiD.toFixed(2)}
- RSI: ${currentData.rsi.toFixed(2)}
- Squeeze 상태: ${currentData.squeezeOff ? '해제됨' : '진행중'}
- 매매 신호: ${this.getSignalText(currentData.signal)}

기술적 분석:
${technicalAnalysis}

다음 형식으로 응답해주세요:

1. **현실적 시나리오**: 3개월 후 예상 가격과 수익률
2. **낙관적 시나리오**: 최고 상승 가능 가격과 수익률  
3. **비관적 시나리오**: 최대 하락 가능 가격과 수익률
4. **신뢰도**: 예측의 신뢰도 (0-100%)
5. **주요 근거**: 예측의 주요 근거와 시장 동향 분석
6. **투자 권고사항**: 단기/중기 투자 전략 제안

각 시나리오는 구체적인 가격과 수익률을 포함해주세요.
`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API error:', response.status, errorText);
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
                throw new Error('Invalid response from Gemini API');
            }
            
            return result.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error getting Gemini prediction:', error);
            return this.getFallbackPrediction(symbol, currentData);
        }
    }

    // Gemini API 실패 시 대체 예측
    getFallbackPrediction(symbol, currentData) {
        const currentPrice = currentData.close;
        const sqzmom = currentData.sqzmom;
        const stochRsi = currentData.stochRsiK;
        const signal = currentData.signal;
        
        // 기본 예측 로직
        let realisticChange = 0;
        let optimisticChange = 0;
        let pessimisticChange = 0;
        let confidence = 50;
        
        if (signal > 0) { // 매수 신호
            realisticChange = 5 + (Math.abs(sqzmom) * 100);
            optimisticChange = 15 + (Math.abs(sqzmom) * 200);
            pessimisticChange = -5;
            confidence = 60 + (signal * 10);
        } else if (signal < 0) { // 매도 신호
            realisticChange = -5 - (Math.abs(sqzmom) * 100);
            optimisticChange = 5;
            pessimisticChange = -15 - (Math.abs(sqzmom) * 200);
            confidence = 60 + (Math.abs(signal) * 10);
        } else { // 중립
            realisticChange = stochRsi > 50 ? 3 : -3;
            optimisticChange = 10;
            pessimisticChange = -10;
            confidence = 40;
        }
        
        const realisticPrice = currentPrice * (1 + realisticChange / 100);
        const optimisticPrice = currentPrice * (1 + optimisticChange / 100);
        const pessimisticPrice = currentPrice * (1 + pessimisticChange / 100);
        
        return `
**현실적 시나리오**: $${realisticPrice.toFixed(2)} (${realisticChange > 0 ? '+' : ''}${realisticChange.toFixed(1)}%)
**낙관적 시나리오**: $${optimisticPrice.toFixed(2)} (${optimisticChange > 0 ? '+' : ''}${optimisticChange.toFixed(1)}%)
**비관적 시나리오**: $${pessimisticPrice.toFixed(2)} (${pessimisticChange > 0 ? '+' : ''}${pessimisticChange.toFixed(1)}%)
**신뢰도**: ${confidence}%

**주요 근거**: 
- SQZMOM: ${sqzmom > 0 ? '상승 모멘텀' : '하락 모멘텀'}
- Stochastic RSI: ${stochRsi > 70 ? '과매수' : stochRsi < 30 ? '과매도' : '중립'}
- 매매 신호: ${this.getSignalText(signal)}

**투자 권고사항**: 
${signal > 0 ? '단기 매수 관점에서 접근하되, 손절매 설정 필요' : 
  signal < 0 ? '단기 매도 관점에서 접근하되, 반등 시 매수 고려' : 
  '중립적 관점에서 시장 관망'}
        `;
    }

    // 신호 텍스트 변환
    getSignalText(signal) {
        switch(signal) {
            case 2: return '강력한 매수';
            case 1: return '매수';
            case 0: return '중립';
            case -1: return '매도';
            case -2: return '강력한 매도';
            default: return '중립';
        }
    }

    // 차트 생성
    createCharts(data) {
        this.createPriceChart(data);
        this.createIndicatorsChart(data);
    }

    // 가격 차트 생성
    createPriceChart(data) {
        const ctx = document.getElementById('priceChart').getContext('2d');
        
        if (this.charts.priceChart) {
            this.charts.priceChart.destroy();
        }
        
        const labels = data.map(d => d.timestamp.toLocaleTimeString());
        const prices = data.map(d => d.close);
        const signals = data.map(d => d.signal);
        
        this.charts.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '가격',
                    data: prices,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff',
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
        
        // 매매 신호 표시
        signals.forEach((signal, index) => {
            if (signal !== 0) {
                const point = this.charts.priceChart.data.datasets[0].data[index];
                const color = signal > 0 ? '#00ff88' : '#ff4444';
                const marker = signal > 0 ? '▲' : '▼';
                
                // 신호 포인트 추가
                this.charts.priceChart.data.datasets.push({
                    label: signal > 0 ? '매수 신호' : '매도 신호',
                    data: Array(data.length).fill(null).map((_, i) => i === index ? point : null),
                    type: 'scatter',
                    backgroundColor: color,
                    borderColor: color,
                    pointRadius: 8,
                    showLine: false
                });
            }
        });
        
        this.charts.priceChart.update();
    }

    // 지표 차트 생성
    createIndicatorsChart(data) {
        const ctx = document.getElementById('indicatorsChart').getContext('2d');
        
        if (this.charts.indicatorsChart) {
            this.charts.indicatorsChart.destroy();
        }
        
        const labels = data.map(d => d.timestamp.toLocaleTimeString());
        
        this.charts.indicatorsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'SQZMOM',
                    data: data.map(d => d.sqzmom),
                    borderColor: '#00bfff',
                    backgroundColor: 'rgba(0, 191, 255, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                }, {
                    label: 'Stoch RSI K',
                    data: data.map(d => d.stochRsiK),
                    borderColor: '#ff8800',
                    backgroundColor: 'rgba(255, 136, 0, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }, {
                    label: 'Stoch RSI D',
                    data: data.map(d => d.stochRsiD),
                    borderColor: '#ff4444',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff',
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 100,
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    // UI 업데이트
    updateUI(data, prediction) {
        const latest = data[data.length - 1];
        
        // 현재 상태 업데이트
        document.getElementById('currentPrice').textContent = `$${latest.close.toFixed(2)}`;
        document.getElementById('sqzmom').textContent = latest.sqzmom.toFixed(4);
        document.getElementById('stochRsi').textContent = `${latest.stochRsiK.toFixed(1)} / ${latest.stochRsiD.toFixed(1)}`;
        document.getElementById('signal').textContent = this.getSignalText(latest.signal);
        
        // 예측 결과 파싱 및 표시
        this.parseAndDisplayPrediction(prediction, latest.close);
        
        // 기술적 분석 업데이트
        this.updateTechnicalAnalysis(latest);
    }

    // 예측 결과 파싱 및 표시
    parseAndDisplayPrediction(prediction, currentPrice) {
        // 기본값 설정
        let realisticPrice = currentPrice * 1.05;
        let optimisticPrice = currentPrice * 1.15;
        let pessimisticPrice = currentPrice * 0.95;
        let confidence = 50;
        
        // Gemini 응답에서 가격 정보 추출 시도
        const priceRegex = /\$(\d+\.?\d*)/g;
        const prices = prediction.match(priceRegex);
        if (prices && prices.length >= 3) {
            realisticPrice = parseFloat(prices[0].replace('$', ''));
            optimisticPrice = parseFloat(prices[1].replace('$', ''));
            pessimisticPrice = parseFloat(prices[2].replace('$', ''));
        }
        
        // 신뢰도 추출 시도
        const confidenceMatch = prediction.match(/신뢰도[:\s]*(\d+)%/);
        if (confidenceMatch) {
            confidence = parseInt(confidenceMatch[1]);
        }
        
        // UI 업데이트
        document.getElementById('realisticPrice').textContent = `$${realisticPrice.toFixed(2)}`;
        document.getElementById('realisticChange').textContent = `${((realisticPrice - currentPrice) / currentPrice * 100).toFixed(1)}%`;
        
        document.getElementById('optimisticPrice').textContent = `$${optimisticPrice.toFixed(2)}`;
        document.getElementById('optimisticChange').textContent = `${((optimisticPrice - currentPrice) / currentPrice * 100).toFixed(1)}%`;
        
        document.getElementById('pessimisticPrice').textContent = `$${pessimisticPrice.toFixed(2)}`;
        document.getElementById('pessimisticChange').textContent = `${((pessimisticPrice - currentPrice) / currentPrice * 100).toFixed(1)}%`;
        
        document.getElementById('confidenceScore').textContent = `${confidence}%`;
        document.getElementById('predictionText').textContent = prediction;
    }

    // 기술적 분석 업데이트
    updateTechnicalAnalysis(latest) {
        // SQZMOM 분석
        let sqzmomAnalysis = '';
        if (latest.sqzmom > 0) {
            sqzmomAnalysis = '상승 모멘텀이 감지되었습니다. 매수 관점에서 접근할 수 있습니다.';
        } else if (latest.sqzmom < 0) {
            sqzmomAnalysis = '하락 모멘텀이 감지되었습니다. 매도 관점에서 접근할 수 있습니다.';
        } else {
            sqzmomAnalysis = '중립 상태입니다. 추가 신호를 기다리는 것이 좋습니다.';
        }
        document.getElementById('sqzmomAnalysis').textContent = sqzmomAnalysis;
        
        // Stochastic RSI 분석
        let stochRsiAnalysis = '';
        if (latest.stochRsiK > 80) {
            stochRsiAnalysis = '과매수 구간입니다. 조정 가능성이 높습니다.';
        } else if (latest.stochRsiK < 20) {
            stochRsiAnalysis = '과매도 구간입니다. 반등 가능성이 높습니다.';
        } else if (latest.stochRsiK > latest.stochRsiD) {
            stochRsiAnalysis = '상승 추세가 지속되고 있습니다.';
        } else {
            stochRsiAnalysis = '하락 추세가 지속되고 있습니다.';
        }
        document.getElementById('stochRsiAnalysis').textContent = stochRsiAnalysis;
        
        // 매매 신호 분석
        let signalAnalysis = '';
        switch(latest.signal) {
            case 2:
                signalAnalysis = '강력한 매수 신호입니다. 진입을 고려해볼 수 있습니다.';
                break;
            case 1:
                signalAnalysis = '매수 신호입니다. 신중한 진입을 고려해보세요.';
                break;
            case 0:
                signalAnalysis = '중립 신호입니다. 추가 신호를 기다리는 것이 좋습니다.';
                break;
            case -1:
                signalAnalysis = '매도 신호입니다. 포지션 정리를 고려해보세요.';
                break;
            case -2:
                signalAnalysis = '강력한 매도 신호입니다. 즉시 포지션 정리를 고려하세요.';
                break;
        }
        document.getElementById('signalAnalysis').textContent = signalAnalysis;
        
        // 시장 동향
        let marketTrend = '';
        if (latest.squeezeOff) {
            marketTrend = '변동성이 확대되고 있습니다. 큰 움직임이 예상됩니다.';
        } else {
            marketTrend = '변동성이 축소되고 있습니다. 횡보 가능성이 높습니다.';
        }
        document.getElementById('marketTrend').textContent = marketTrend;
    }

    // 오류 표시
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorSection').style.display = 'flex';
    }

    // 오류 숨기기
    hideError() {
        document.getElementById('errorSection').style.display = 'none';
    }

    // 로딩 표시
    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('predictBtn').disabled = true;
    }

    // 로딩 숨기기
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('predictBtn').disabled = false;
    }

    // 메인 예측 함수
    async predictETF() {
        const symbol = document.getElementById('etfSymbol').value.trim().toUpperCase();
        
        if (!symbol) {
            this.showError('ETF 종목 코드를 입력해주세요.');
            return;
        }
        
        try {
            this.showLoading();
            
            // 데이터 로딩
            const rawData = await this.loadETFData(symbol);
            console.log('Loaded data points:', rawData.length);
            
            if (rawData.length < 50) {
                throw new Error('데이터가 부족합니다. 최소 50개의 데이터 포인트가 필요합니다.');
            }
            
            // 지표 계산
            const sqzmomData = this.calculateSqueezeMomentum(rawData);
            const stochRsiData = this.calculateStochasticRSI(rawData);
            
            // 데이터 결합 (지표 계산 결과와 원본 데이터 매칭)
            const processedData = rawData.map((d, i) => {
                const sqzmomIndex = Math.max(0, i - 19); // 20일 이동평균 고려
                const stochIndex = Math.max(0, i - 13); // 14일 RSI 고려
                
                return {
                    ...d,
                    sqzmom: sqzmomData.sqzmom[sqzmomIndex] || 0,
                    squeezeOn: sqzmomData.squeezeOn[sqzmomIndex] || false,
                    squeezeOff: sqzmomData.squeezeOff[sqzmomIndex] || false,
                    stochRsiK: stochRsiData.stochRsiK[stochIndex] || 50,
                    stochRsiD: stochRsiData.stochRsiD[stochIndex] || 50,
                    rsi: stochRsiData.rsi[stochIndex] || 50
                };
            });
            
            // 신호 생성
            const { signals, signalStrength } = this.generateTradingSignals(processedData);
            
            // 신호 데이터 추가
            const finalData = processedData.map((d, i) => ({
                ...d,
                signal: signals[i] || 0,
                signalStrength: signalStrength[i] || 0
            }));
            
            this.currentData = finalData;
            
            // 기술적 분석 텍스트 생성
            const latest = finalData[finalData.length - 1];
            const technicalAnalysis = `
현재 가격: $${latest.close.toFixed(2)}
SQZMOM: ${latest.sqzmom.toFixed(4)} (${latest.sqzmom > 0 ? '상승' : '하락'} 모멘텀)
Stochastic RSI: K=${latest.stochRsiK.toFixed(2)}, D=${latest.stochRsiD.toFixed(2)}
RSI: ${latest.rsi.toFixed(2)}
Squeeze 상태: ${latest.squeezeOff ? '해제됨' : '진행중'}
매매 신호: ${this.getSignalText(latest.signal)}

최근 10개 데이터 포인트의 평균:
- 평균 가격: $${(finalData.slice(-10).reduce((sum, d) => sum + d.close, 0) / 10).toFixed(2)}
- 평균 SQZMOM: ${(finalData.slice(-10).reduce((sum, d) => sum + d.sqzmom, 0) / 10).toFixed(4)}
- 평균 Stoch RSI: ${(finalData.slice(-10).reduce((sum, d) => sum + d.stochRsiK, 0) / 10).toFixed(2)}
            `;
            
            // Gemini 예측 요청
            const prediction = await this.getGeminiPrediction(symbol, latest, technicalAnalysis);
            
            // UI 업데이트
            this.updateUI(finalData, prediction);
            this.createCharts(finalData);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Prediction error:', error);
            this.showError(`예측 중 오류가 발생했습니다: ${error.message}`);
            this.hideLoading();
        }
    }
}

// 전역 인스턴스 생성
const predictor = new ETFPredictor();

// 이벤트 리스너 등록
document.getElementById('predictBtn').addEventListener('click', () => predictor.predictETF());
document.getElementById('etfSymbol').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        predictor.predictETF();
    }
});

// 오류 숨기기 함수
function hideError() {
    predictor.hideError();
}

// 페이지 로드 시 QQQ로 자동 예측
window.addEventListener('load', () => {
    // predictor.predictETF(); // 자동 실행을 원하면 주석 해제
});
