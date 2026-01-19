// 天气API相关配置 - 改为使用高德地图天气API
// 已配置有效的高德地图API密钥
const API_KEY = '719491fed017bd78995a2f1e226d5bf3'; 
// 高德地图天气API URL
const WEATHER_URL = 'https://restapi.amap.com/v3/weather/weatherInfo';
// 高德地图地理编码API URL（用于获取城市编码）
const GEOCODE_URL = 'https://restapi.amap.com/v3/geocode/geo';

// 获取DOM元素
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherInfo = document.getElementById('weatherInfo');

// 添加查询按钮点击事件
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeather(city);
    } else {
        showError('请输入城市名称');
    }
});

// 添加回车键事件
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeather(city);
        } else {
            showError('请输入城市名称');
        }
    }
});

// 获取城市的adcode（高德地图API需要adcode）
async function getAdcode(cityName) {
    try {
        const geoUrl = `${GEOCODE_URL}?address=${encodeURIComponent(cityName)}&key=${API_KEY}`;
        console.log('地理编码请求URL:', geoUrl);
        
        const response = await fetch(geoUrl, {
            method: 'GET',
            mode: 'cors'
        });
        
        console.log('地理编码响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error('连接不上，好像网络有点问题X_X');
        }
        
        const data = await response.json();
        console.log('地理编码返回数据:', JSON.stringify(data, null, 2));
        
        // 详细的错误信息
        if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) {
            throw new Error('搜不到呢，换个城市名称试试');
        }
        
        return data.geocodes[0].adcode; // 返回第一个匹配城市的adcode
    } catch (error) {
        console.error('getAdcode错误:', error);
        // 处理网络错误，返回友好提示
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('连接不上，好像网络有点问题X_X');
        }
        throw error;
    }
}

// 调用天气API获取数据
async function getWeather(city) {
    try {
        // 1. 先获取城市的adcode
        const adcode = await getAdcode(city);
        
        // 2. 请求天气数据（分别请求实时天气和预报，确保获取完整数据）
        // 实时天气
        const liveWeatherUrl = `${WEATHER_URL}?city=${adcode}&key=${API_KEY}&extensions=base`;
        // 预报天气
        const forecastWeatherUrl = `${WEATHER_URL}?city=${adcode}&key=${API_KEY}&extensions=all`;
        
        console.log('实时天气请求URL:', liveWeatherUrl);
        console.log('预报天气请求URL:', forecastWeatherUrl);
        
        // 并行请求
        const [liveResponse, forecastResponse] = await Promise.all([
            fetch(liveWeatherUrl, { method: 'GET', mode: 'cors' }),
            fetch(forecastWeatherUrl, { method: 'GET', mode: 'cors' })
        ]);
        
        if (!liveResponse.ok || !forecastResponse.ok) {
            throw new Error('连接不上，好像网络有点问题X_X');
        }
        
        const liveData = await liveResponse.json();
        const forecastData = await forecastResponse.json();
        
        console.log('实时天气返回数据:', liveData);
        console.log('预报天气返回数据:', forecastData);
        
        if (liveData.status !== '1' || forecastData.status !== '1') {
            throw new Error('连接不上，好像网络有点问题X_X');
        }
        
        // 合并数据，兼容原有displayWeather函数
        const mergedData = {
            lives: liveData.lives,
            forecasts: forecastData.forecasts
        };
        
        // 3. 显示天气信息
        displayWeather(mergedData, city);
    } catch (error) {
        console.error('getWeather错误:', error);
        // 处理网络错误，返回友好提示
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showError('连接不上，好像网络有点问题X_X');
        } else {
            showError(error.message);
        }
    }
}

// 获取穿衣建议
function getClothingAdvice(temperature, weather) {
    const temp = parseInt(temperature);
    
    if (temp > 25) {
        return '👕 夏季服装：建议穿短袖、短裤、轻薄衣物，注意防晒';
    } else if (temp > 15) {
        return '🧥 春秋服装：建议穿长袖、薄外套，舒适为主';
    } else if (temp > 5) {
        return '🧣 初冬服装：建议穿毛衣、厚外套，注意保暖';
    } else {
        return '🧤 冬季服装：建议穿羽绒服、厚毛衣、保暖裤，做好防寒措施';
    }
}

// 获取出行建议
function getTravelAdvice(weather) {
    const weatherLower = weather.toLowerCase();
    
    if (weatherLower.includes('晴')) {
        return '☀️ 适合出行：天气晴朗，建议户外活动，注意防晒';
    } else if (weatherLower.includes('云')) {
        return '☁️ 适合出行：天气多云，温度适宜，适合户外活动';
    } else if (weatherLower.includes('雨')) {
        return '🌧️ 出行提示：有雨，建议携带雨具，注意道路湿滑';
    } else if (weatherLower.includes('雪')) {
        return '❄️ 出行提示：有雪，注意防滑，建议减少出行';
    } else if (weatherLower.includes('雾')) {
        return '🌫️ 出行提示：有雾，注意交通安全，减速慢行';
    } else if (weatherLower.includes('霾')) {
        return '😷 出行提示：有霾，建议减少户外活动，佩戴口罩';
    } else {
        return '🚶 出行提示：请根据实际天气情况调整出行计划';
    }
}

// 根据天气设置背景图片
function setWeatherBackground(weather) {
    const weatherLower = weather.toLowerCase();
    let bgImage = '晴'; // 默认晴天背景
    
    // 根据天气状况匹配背景图片
    if (weatherLower.includes('雨')) {
        bgImage = '雨';
    } else if (weatherLower.includes('雪')) {
        bgImage = '雪';
    } else if (weatherLower.includes('雾')) {
        bgImage = '雾';
    } else if (weatherLower.includes('霾')) {
        bgImage = '霾';
    } else if (weatherLower.includes('阴')) {
        bgImage = '阴';
    } else if (weatherLower.includes('云')) {
        bgImage = '多云';
    }
    
    // 设置背景图片路径
    const bgPath = `pic/${bgImage}.png`;
    document.body.style.backgroundImage = `url('${bgPath}')`;
    console.log('设置背景图片:', bgPath);
}

// 显示天气信息
function displayWeather(data, cityName) {
    try {
        // 检查数据完整性
        if (!data.lives || data.lives.length === 0) {
            throw new Error('未获取到实时天气数据');
        }
        
        if (!data.forecasts || data.forecasts.length === 0) {
            throw new Error('未获取到预报天气数据');
        }
        
        const liveWeather = data.lives[0]; // 实时天气
        const forecast = data.forecasts[0]; // 预报天气
        
        if (!forecast.casts || forecast.casts.length === 0) {
            throw new Error('未获取到今日预报数据');
        }
        
        const todayForecast = forecast.casts[0]; // 今日预报
        
        // 高德地图API返回的是白天温度和夜间温度，需要计算最低和最高温度
        const dayTemp = parseInt(todayForecast.daytemp);
        const nightTemp = parseInt(todayForecast.nighttemp);
        
        // 计算最低和最高温度
        const minTemp = Math.min(dayTemp, nightTemp);
        const maxTemp = Math.max(dayTemp, nightTemp);
        
        // 获取穿衣和出行建议
        const clothingAdvice = getClothingAdvice(liveWeather.temperature, liveWeather.weather);
        const travelAdvice = getTravelAdvice(liveWeather.weather);
        
        // 设置背景图片
        setWeatherBackground(liveWeather.weather);
        
        // 获取未来两天的预报数据
        const tomorrowForecast = forecast.casts[1]; // 明天预报
        const dayAfterTomorrowForecast = forecast.casts[2]; // 后天预报
        
        weatherInfo.innerHTML = `
            <div class="weather-main">
                <div class="current-weather">
                    <h2>${cityName}</h2>
                    <p>${liveWeather.weather}</p>
                    <div class="temperature">${liveWeather.temperature}°C</div>
                    <div class="temp-range">
                        <span>最低温度: ${minTemp}°C</span>
                        <span> | </span>
                        <span>最高温度: ${maxTemp}°C</span>
                    </div>
                    <div class="advice-section">
                        <div class="advice-item">${clothingAdvice}</div>
                        <div class="advice-item">${travelAdvice}</div>
                    </div>
                </div>
                <div class="future-weather">
                    <h3>未来两天</h3>
                    <div class="future-days">
                        <div class="future-day">
                            <h4>${tomorrowForecast.date}</h4>
                            <p>${tomorrowForecast.dayweather}</p>
                            <p>温度: ${tomorrowForecast.daytemp}°C ~ ${tomorrowForecast.nighttemp}°C</p>
                        </div>
                        <div class="future-day">
                            <h4>${dayAfterTomorrowForecast.date}</h4>
                            <p>${dayAfterTomorrowForecast.dayweather}</p>
                            <p>温度: ${dayAfterTomorrowForecast.daytemp}°C ~ ${dayAfterTomorrowForecast.nighttemp}°C</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('显示天气信息错误:', error);
        showError(`天气数据显示失败: ${error.message}`);
    }
}

// 显示错误信息
function showError(message) {
    weatherInfo.innerHTML = `<p class="error">${message}</p>`;
}

// 页面加载时的初始提示
window.onload = () => {
    weatherInfo.innerHTML = `<p>请输入城市名称查询天气</p>`;
};