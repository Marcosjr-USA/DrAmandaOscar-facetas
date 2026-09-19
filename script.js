const video=document.querySelector('video');
document.addEventListener('visibilitychange',()=>{if(!video)return;document.hidden?video.pause():video.play().catch(()=>{});});
