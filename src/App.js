import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as echarts from 'echarts';

function App() {
    // 儲存選擇的套餐
    const [selectedPlans, setSelectedPlans] = useState([]);
    // 儲存從後端獲取的套餐數據
    const [planData, setPlanData] = useState([]);

    // 定義所有可選套餐
    const availablePlans = [
        { operator: 'CTM', series: 'simOnly', name: 'CTM - 淨月費計劃' },
        { operator: 'CTM', series: 'phonePlanWithoutPhonePrice', name: 'CTM - iPhone16 Pro 256GB 購機上台（不折合機價）' },
        { operator: 'CTM', series: 'phonePlan', name: 'CTM - iPhone16 Pro 256GB 購機上台（折合機價）' },
        { operator: 'CTM', series: 'stuPlan', name: 'CTM - 學生計劃' },
        { operator: 'CTM', series: 'prepaidPackage', name: 'CTM - 預付卡' },
        { operator: 'CTMO', series: 'publicPlanThree', name: 'CTMO - 三地計劃' },
        { operator: 'CTMO', series: 'publicPlanTwo', name: 'CTMO - 兩地計劃' },
        { operator: 'CTMO', series: 'stuPlan', name: 'CTMO - 學生計劃' },
        { operator: 'CMHK', series: 'publicPlanThree', name: 'CMHK - 一卡三地計劃' },
        { operator: 'CMHK', series: 'publicPlanTwo', name: 'CMHK - 一卡兩地計劃' },
        { operator: 'CUHK', series: 'publicPlanCN', name: 'CUHK - 5G ONE大灣區' },
        { operator: 'CUHK', series: 'noContractPlan', name: 'CUHK - 月神卡（無合約）' },
		{ operator: 'Three', series: 'publicPlanThree', name: '3 - 5G數據跨地自「遊」行月費計劃' },
        { operator: 'Three', series: 'diy', name: '3 - Diy' },
        { operator: 'Free', series: 'publicPlanCN', name: 'Free - 19.99EUR' },
    ];

    // 處理套餐選擇變更，更新選擇的套餐
    const handleCheckboxChange = (e, plan) => {
        const { checked } = e.target;
        setSelectedPlans(prevPlans => {
            if (checked) {
                // 如果選中該套餐，將它加入到已選套餐中
                return [...prevPlans, plan];
            } else {
                // 如果取消選中該套餐，從已選套餐中移除
                return prevPlans.filter(p => p.operator !== plan.operator || p.series !== plan.series);
            }
        });
    };

    // 當選擇的套餐有變化時發送 API 請求
    useEffect(() => {
        if (selectedPlans.length > 0) {
            // 根據選擇的套餐組裝查詢請求
            const queries = selectedPlans.map(plan => ({ operator: plan.operator, series: plan.series }));

            // 發送 API 請求獲取套餐數據
            axios.post('https://roamplan-api.account-9cc.workers.dev/', { queries })
                .then(response => {
                    // 設置返回的套餐數據
                    setPlanData(response.data);
                    // 渲染圖表
                    renderChart(response.data);
                })
                .catch(error => {
                    console.error('Error fetching plan data:', error);
                });
        } else {
            // 如果沒有選擇任何套餐，清除圖表數據
            setPlanData([]);
            renderChart([]);  // 清空圖表
        }
    }, [selectedPlans]);

    // 渲染圖表的函數
    const renderChart = (data) => {
        // 獲取圖表容器
        const chartDom = document.getElementById('chart');
        const myChart = echarts.init(chartDom);
		
		
		
        // 如果沒有數據，直接返回，清空圖表
        if (data.length === 0) {
            myChart.clear();
            return;
        }

        // 從所有套餐數據中提取所有的流量總量並去重排序
        const allDataVolumes = data.reduce((acc, plan) => acc.concat(plan.dataVolume), []);
        const uniqueDataVolumes = Array.from(new Set(allDataVolumes)).sort((a, b) => a - b);

        // 構建每個套餐的數據系列
        const seriesData = data.map(plan => {
            // 將每個套餐的流量單價轉換為對應的流量區間數據
            let dataVolumeMap = uniqueDataVolumes.map(volume => {
                // 找到流量區間對應的單價，若無數據則為 null
                const index = plan.dataVolume.indexOf(volume);
                return index !== -1 ? plan.unitPrice[index] : null;
            });

            // 確保相同單價區間內的數據為水平直線
            for (let i = 1; i < dataVolumeMap.length; i++) {
                if (dataVolumeMap[i] === dataVolumeMap[i - 1] && dataVolumeMap[i] !== null) {
                    // 如果相鄰兩個區間的單價相同，將其值設為上一個區間的單價，這樣就會形成直線
                    dataVolumeMap[i] = dataVolumeMap[i - 1];
                }
            }

            return {
                // 使用模板字符串動態設置套餐名稱
                name: `${plan.operator} - ${plan.series}`,
                type: 'line',  // 設置為折線圖
                smooth: false,  // 關閉平滑，確保顯示折線而非曲線
                connectNulls: true,  // 連接空值，避免顯示中斷
                data: dataVolumeMap,  // 套餐的流量和單價數據
            };
        });

        // 設置圖表的配置選項
        const option = {
            title: {
                text: '運營商套餐比較：流量單價變化',
                left: 'center',
            },
            tooltip: {
                trigger: 'axis',
                formatter: params => {
                    // 顯示流量總量和各套餐的單價
                    let tooltip = `0 - ${params[0].axisValue} GB<br/>`;
                    params.forEach(item => {
                        tooltip += `${item.marker} ${item.seriesName}: ${item.data} MOP, HKD/GB<br/>`;
                    });
                    //return tooltip;
					// 使用 max-width 来限制宽度，同时使用 white-space: normal 让内容换行
					return `<div style="max-width: 300px; white-space: normal; word-wrap: break-word;">${tooltip}</div>`;
                },
				position: function (point, params, dom, rect, size) {
					// 获取屏幕的宽高
					const screenWidth = window.innerWidth;
					const screenHeight = window.innerHeight;

					// 计算居中位置
					const left = (screenWidth - size.contentSize[0]) / 2;
					const top = (screenHeight - size.contentSize[1]) / 2;

					// 返回居中的位置
					return [left, top];
				},
            },
            legend: {
                type: 'scroll',
                top: '10%',
                data: seriesData.map(s => s.name),
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,  // 顯示類別刻度，讓數據點處於軸線之間
                data: uniqueDataVolumes,  // 使用去重後的流量區間作為 x 軸數據
                name: '流量總量 (GB)',
                axisLine: {
                    show: true,
                    lineStyle: { color: '#000', type: 'solid' },  // 設置 x 軸顏色
                },
                axisTick: { show: false },  // 隱藏刻度線
                axisLabel: { interval: 0 },  // 顯示所有刻度
                splitLine: {
                    show: true,  // 顯示分隔線
                    lineStyle: { color: '#ccc', type: 'dashed' },  // 設置虛線
                },
            },
            yAxis: {
                type: 'value',
                name: '單價 (MOP, HKD/GB)',  // 設置 y 軸名稱
            },
            series: seriesData,  // 使用構建好的系列數據
        };

        // 設置圖表選項並渲染
        myChart.setOption(option);

        // 監聽窗口大小變化，讓圖表自適應大小
        window.addEventListener('resize', myChart.resize);
    };

    return (
        <div>
            <h1>中國大陸漫遊PLAN流量單價比較</h1>
            {/* 顯示所有可選套餐並允許用戶選擇 */}
            <div>
                <h2>選擇顯示的套餐</h2>
                <div>
                    {availablePlans.map(plan => (
                        <div key={`${plan.operator}-${plan.series}`}>
                            <input
                                type="checkbox"
                                id={`${plan.operator}-${plan.series}`}
                                onChange={e => handleCheckboxChange(e, plan)}  // 當選擇改變時更新選擇的套餐
                            />
                            <label htmlFor={`${plan.operator}-${plan.series}`}>{plan.name}</label>
                        </div>
                    ))}
                </div>
            </div>
            {/* 顯示圖表的容器 */}
            <div id="chart" style={{ width: '100%', height: '600px' }}></div>
        </div>
    );
}

export default App;