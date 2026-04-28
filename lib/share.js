// Opens the platform share dialog in a small popup window

export function shareOnFacebook(url = window.location.href) {
  const u = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(u, '_blank', 'width=600,height=400,noopener');
}

export function shareOnTwitter(url = window.location.href, text = '') {
  const u = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  window.open(u, '_blank', 'width=600,height=400,noopener');
}

// Clipboard API with execCommand fallback for older browsers
export async function copyLink(url = window.location.href) {
  try {
    await navigator.clipboard.writeText(url);
    return { success: true };
  } catch {
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return { success: true };
  }
}