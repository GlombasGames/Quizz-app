import { AdMob } from '@capacitor-community/admob';

export async function initAdMob() {
    await AdMob.initialize();
}

export async function showBanner() {
    await AdMob.showBanner({
        adId: 'ca-app-pub-3940256099942544/6300978111', // de prueba
        adSize: 'ADAPTIVE_BANNER',
        position: 'TOP_CENTER',
        margin: 0,
        isTesting: true
    });

    AdMob.addListener('bannerAdSizeChanged', info => {
        const banner = document.getElementById('banner');
        if (banner) banner.style.height = `${info.height}px`;
    });
}

export async function showRewarded() {
    return new Promise(async (resolve, reject) => {
        try {
            let rewarded = false;

            const rewardListener = await AdMob.addListener('onRewardedVideoAdReward', () => {
                console.log('✅ Recompensa registrada');
                rewarded = true;
            });

            const dismissListener = await AdMob.addListener('onRewardedVideoAdDismissed', () => {
                console.log('✅ Anuncio cerrado');
                rewardListener.remove();
                dismissListener.remove();
                resolve(rewarded); // true si fue recompensado
            });

            await AdMob.prepareRewardVideoAd({
                adId: 'ca-app-pub-3940256099942544/5224354917',
                isTesting: true
            });

            await AdMob.showRewardVideoAd();
        } catch (e) {
            console.error('❌ Error en rewarded:', e);
            reject(e);
        }
    });
}
