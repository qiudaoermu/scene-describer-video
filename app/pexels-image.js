import { createClient } from 'pexels';

const client = createClient('oVaOZUHlLhFNilLPJQ1jvAPS8BFngRiKDDsEvG43ivJBXJF5VfuBqAG6');
const query = '现实生活场景';

client.photos
  .search({ query, locale: "zh-cn", per_page: 10 })
  .then((res) => {
        console.log(res.photos);
      //   'https://www.pexels.com/zh-cn/photo/10496231/',
      //   https://images.pexels.com/photos/10496231/pexels-photo-10496231.jpeg
        const photos = res.photos.map(item => ({
            ...item,
            src: formatPexelsUrl(item.url)
        }))
        console.log(photos,'photos')
  });


  function formatPexelsUrl(url) {
      // Extract the number using regex (looks for sequence of digits at the end before the last slash)
      const numberMatch = url.match(/\/(\d+)\/?$/);
      
      if (!numberMatch) {
          throw new Error('No number found in the URL');
      }
      
      const number = numberMatch[1];
      
      // Construct the new URL format
      return `https://images.pexels.com/photos/${number}/pexels-photo-${number}.jpeg`;
  }