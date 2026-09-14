import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  '/': 'New Order - MuftGo Laundry POS',
  '/order-history': 'Order History - MuftGo Laundry POS',
  '/login': 'Login - MuftGo Laundry POS',
  '/404': 'Page Not Found - MuftGo Laundry POS',
};

export const usePageTitle = (customTitle?: string, suffix?: string) => {
  const location = useLocation();

  useEffect(() => {
    let title = 'MuftGo Laundry POS';
    
    if (customTitle) {
      title = `${customTitle} - MuftGo Laundry POS`;
    } else {
      title = PAGE_TITLES[location.pathname] || 'MuftGo Laundry POS';
    }
    
    if (suffix) {
      title = title.replace(' - MuftGo Laundry POS', ` ${suffix} - MuftGo Laundry POS`);
    }
    
    document.title = title;
  }, [location.pathname, customTitle, suffix]);
};

export const setPageTitle = (title: string) => {
  document.title = `${title} - MuftGo Laundry POS`;
};

export const updatePageTitleWithCount = (basePage: string, count?: number) => {
  const countSuffix = count !== undefined ? ` (${count})` : '';
  document.title = `${basePage}${countSuffix} - MuftGo Laundry POS`;
};
