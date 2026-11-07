export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const POPULAR_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano', flag: '🇨🇴' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano', flag: '🇲🇽' },
  { code: 'VES', symbol: 'Bs', name: 'Bolívar Venezolano', flag: '🇻🇪' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino', flag: '🇦🇷' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno', flag: '🇨🇱' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano', flag: '🇵🇪' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño', flag: '🇧🇷' },
  { code: 'DOP', symbol: '$', name: 'Peso Dominicano', flag: '🇩🇴' },
  { code: 'CRC', symbol: '₡', name: 'Colón Costarricense', flag: '🇨🇷' },
  { code: 'GTQ', symbol: 'Q', name: 'Quetzal Guatemalteco', flag: '🇬🇹' },
  { code: 'HNL', symbol: 'L', name: 'Lempira Hondureño', flag: '🇭🇳' },
  { code: 'NIO', symbol: 'C$', name: 'Córdoba Nicaragüense', flag: '🇳🇮' },
  { code: 'BOB', symbol: 'Bs', name: 'Boliviano', flag: '🇧🇴' },
  { code: 'UYU', symbol: '$', name: 'Peso Uruguayo', flag: '🇺🇾' },
  { code: 'PYG', symbol: '₲', name: 'Guaraní Paraguayo', flag: '🇵🇾' },
  { code: 'CAD', symbol: '$', name: 'Dólar Canadiense', flag: '🇨🇦' },
  { code: 'GBP', symbol: '£', name: 'Libra Esterlina', flag: '🇬🇧' },
  { code: 'CHF', symbol: 'Fr', name: 'Franco Suizo', flag: '🇨🇭' },
  { code: 'JPY', symbol: '¥', name: 'Yen Japonés', flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥', name: 'Yuan Chino', flag: '🇨🇳' },
  { code: 'AUD', symbol: '$', name: 'Dólar Australiano', flag: '🇦🇺' },
  { code: 'INR', symbol: '₹', name: 'Rupia India', flag: '🇮🇳' },
  { code: 'KRW', symbol: '₩', name: 'Won Surcoreano', flag: '🇰🇷' },
];

