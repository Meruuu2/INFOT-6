// lib/share.js

export function shareOnFacebook(url = window.location.href) {
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(fbUrl, '_blank', 'width=600,height=400');
}

export function shareOnTwitter(url = window.location.href, text = '') {
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  window.open(twitterUrl, '_blank', 'width=600,height=400');
}

export async function copyLink(url = window.location.href) {
  try {
    await navigator.clipboard.writeText(url);
    return { success: true };
  } catch {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return { success: true };
  }
}

// Usage in a component:
// import { shareOnFacebook, shareOnTwitter, copyLink } from '../lib/share';
// <button onClick={() => shareOnFacebook()}>Share on Facebook</button>
// <button onClick={() => shareOnTwitter(undefined, article.title)}>Share on X</button>
// <button onClick={async () => { await copyLink(); alert('Link copied!'); }}>Copy Link</button>