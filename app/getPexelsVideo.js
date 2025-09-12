import { createClient } from 'pexels';

const client = createClient(
  "oVaOZUHlLhFNilLPJQ1jvAPS8BFngRiKDDsEvG43ivJBXJF5VfuBqAG6"
);

client.videos.popular({ per_page: 1,page:2 }).then(videos => {
      console.log(videos,'videos')
});