const binanceSocketUrl = 'wss://stream.binance.com:9443/ws';

// Define trading pairs
const tradingPairs = ['pivxusdt'];

// DOM references
const doms = {
  buySellList: document.getElementById('buySellList')
};

// Trade data storage
const tradeData = {
  pivxusdt: [],
  pivxbtc: []
};

const allTradeData = [];

// Thresholds
let threshold1 = 20;
let threshold2 = 1000;
let maximumItems = 50;

// Sound event queue
const soundQueue = [];
let isPlayingSound = false;
const SOUND_DELAY = 1; // Delay in milliseconds between sound triggers

// Number formatting
function formatNumber(num) {
  if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + "M";
  } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + "K";
  } else {
      return num.toFixed(2);
  }
}

// Function to update the DOM based on trade data
function updateDOM(tradingPair) {
  const trades = tradeData[tradingPair];
  doms.buySellList.innerHTML = trades
    .map((trade) => {
      let colorType;
      if(trade.type === 'Sell') {
        if(trade.total >= threshold2) {
          colorType = "sellSuperColor";
        } else {
          colorType = "sellColor";
        }
      } else {
        if(trade.total >= threshold2) {
          colorType = "buySuperColor";
        } else {
          colorType = "buyColor";
        }
      }
      
      return `
        <div class="buySellListItem ${colorType}">
          <div class="row" style="width:100%">
            <div class="col-4 col-md-6">
              <img src="./img/exchanges/binance.png"> ${tradingPair.toUpperCase()}
            </div>
            <div class="col-4 col-md-3 text-end">
              ${parseFloat(trade.price).toFixed(4)}
            </div>
            <div class="col-4 col-md-3 text-end">
              <b>$</b>${formatNumber(parseFloat(trade.total))}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function combineTradesWithinInterval(trades, intervalMs = 5 * 60 * 1000) {
  let currentTimestamp = Date.now();
  const filteredTrades = trades.filter(trade => currentTimestamp - trade.timestamp <= intervalMs);

  // Separate and sum up 'buy' and 'sell' trades
  const totals = filteredTrades.reduce(
    (acc, trade) => {
      if (trade.type === 'buy') {
        acc.buy += parseFloat(trade.totalUSD);
      } else if (trade.type === 'sell') {
        acc.sell += parseFloat(trade.totalUSD);
      }
      return acc;
    },
    { buy: 0, sell: 0 } // Initialize totals for buys and sells
  );

  return {
    totalBuys: totals.buy.toFixed(2),
    totalSells: totals.sell.toFixed(2),
  };
}

// Function to create a WebSocket for a trading pair
function setupWebSocket(tradingPair) {
  const wsUrl = `${binanceSocketUrl}/${tradingPair}@trade`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log(`Connected to Binance WebSocket for ${tradingPair}`);
  };

  ws.onerror = (error) => {
    console.error(`WebSocket error for ${tradingPair}:`, error);
  };

  ws.onclose = () => {
    console.log(`WebSocket connection closed for ${tradingPair}`);
  };

  ws.onmessage = (event) => {
    const trade = JSON.parse(event.data);
    const amountUSD = (trade.q * trade.p);
    
    allTradeData.push({
      totalUSD: amountUSD.toFixed(2),
      timestamp: trade.E,
      type: trade.m ? 'sell' : 'buy'
    });

    let last1mVolume = combineTradesWithinInterval(allTradeData, 1 * 60 * 1000);
    let last5mVolume = combineTradesWithinInterval(allTradeData, 5 * 60 * 1000);
    let las1hmVolume = combineTradesWithinInterval(allTradeData, 1 * 60 * 60 * 1000);
    let las4hmVolume = combineTradesWithinInterval(allTradeData, 4 * 60 * 60 * 1000);
    updateVolumeBar(last1mVolume.totalBuys, last1mVolume.totalSells, '1m');
    updateVolumeBar(last5mVolume.totalBuys, last5mVolume.totalSells, '5m');
    updateVolumeBar(las1hmVolume.totalBuys, las1hmVolume.totalSells, '1h');
    updateVolumeBar(las4hmVolume.totalBuys, las4hmVolume.totalSells, '4h');

    // Add new trade to the top of the array
    if(amountUSD > threshold1) {
      tradeData[tradingPair].unshift({
        price: trade.p,
        quantity: trade.q,
        total: amountUSD.toFixed(2),
        type: trade.m ? 'Sell' : 'Buy'
      });
    }

    // Ensure the array size does not exceed 20
    if (tradeData[tradingPair].length > maximumItems) {
      tradeData[tradingPair].pop();
    }

    // Set different sounds for different prices
    let soundValue;
    if(amountUSD < threshold1) {
      soundValue = (amountUSD / threshold1);
    } else if(amountUSD < threshold2) {
      soundValue = (amountUSD / threshold2) * 10;
    } else if(amountUSD >= threshold2) {
      soundValue = (amountUSD / threshold2) * 10;
    }

    // Add the sound event to the queue
    soundQueue.push(() => {
      // Check if the context is suspended and resume it
      if (context.state === 'suspended') {
        context.resume().then(() => {
          // Now the context is running, you can safely call tradeToSong
          sound.tradeToSong(soundValue, !trade.m);
        }).catch(error => {
          console.error('Error resuming AudioContext:', error);
        });
      } else {
        // If context is already running, you can call tradeToSong directly
        sound.tradeToSong(soundValue, !trade.m);
      }
    });

    // Process the queue if not already processing
    if (!isPlayingSound) {
      playNextSound();
    }

    // Update the DOM
    updateDOM(tradingPair);
  };
}

// Function to process and play sounds in the queue with a delay
function playNextSound() {
  if (soundQueue.length > 0) {
    isPlayingSound = true;

    // Get the next sound event from the queue and play it
    const nextSoundEvent = soundQueue.shift();
    nextSoundEvent();

    // Wait for the delay before processing the next sound
    setTimeout(() => {
      isPlayingSound = false;
      playNextSound(); // Recursively call to process the next sound
    }, SOUND_DELAY);
  }
}

// Setup WebSocket for each trading pair
tradingPairs.forEach(setupWebSocket);

function updateVolumeBar(buys, sells, type) {
  const total = parseFloat(buys) + parseFloat(sells);
  const buyPercentage = (buys / total) * 100;
  const sellPercentage = (sells / total) * 100;

  const buySection = document.getElementById('buy' + type);
  const sellSection = document.getElementById('sell' + type);

  buySection.style.width = `${buyPercentage}%`;
  sellSection.style.width = `${sellPercentage}%`;

  buySection.innerHTML = `<span class="text"><b>$</b>${formatNumber(parseFloat(buys))}</span>`;
  sellSection.innerHTML = `<span class="text"><b>$</b>${formatNumber(parseFloat(sells))}</span>`;
}