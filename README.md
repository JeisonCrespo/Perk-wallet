# 💵 Perk Wallet

<div align="center">

![Perk Wallet Banner](https://img.shields.io/badge/Perk%20Wallet-v1.0.5-0284C7?style=for-the-badge&logo=android&logoColor=white)
[![Android APK](https://img.shields.io/badge/Release-APK%20Disponible-22C55E?style=for-the-badge&logo=android&logoColor=white)](https://github.com/JeisonCrespo/finanzas-usa/releases/latest)
[![Expo](https://img.shields.io/badge/Expo-SDK%2058-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/Base%20de%20Datos-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://docs.expo.dev/versions/latest/sdk/sqlite/)

<p align="center">
  <b>Tu asistente financiero personal e inteligente 🌎</b><br>
  Gestiona tus cuentas bancarias, tarjetas de crédito, gastos hormiga, cuotas, préstamos y supervivencia financiera con privacidad total, soporte multimoneda y modo claro/oscuro.
</p>

[📲 Descargar APK v1.0.5](https://github.com/JeisonCrespo/finanzas-usa/releases/latest) • [✨ Características](#-características-principales) • [🛠️ Tecnologías](#-tecnologías-utilizadas) • [🚀 Instalación](#-instalación-y-desarrollo)

</div>

---

## 🌟 Características Principales

### 🏦 1. Gestión de Cuentas y Tarjetas de Crédito de EE.UU.
- **Bancos Populares Preconfigurados**: Soporte nativo para plantillas de **Chase, Wells Fargo, Truist, Bank of America, Citi, Capital One, PayPal, Uber Wallet** y más.
- **Control de Tarjetas de Crédito US**:
  - Días de corte (*Closing Date*) y días de pago (*Due Date*).
  - Medidor de porcentaje de utilización de crédito con semáforo **FICO** (óptimo <10%, moderado <30%, crítico >30%).
- **Reorganización Inteligente**: Tus cuentas personales se muestran primero; las cuentas separadas o dinero ajeno se agrupan al final con opción de colapso visual.

### 🌓 2. Modo Blanco y Negro (Tema Dual)
- **Tema Claro y Oscuro**: Alterna al instante con un solo toque desde Ajustes.
- **Diseño Ergonómico**: Fondos suaves, tarjetas con contraste optimizado, gráficas legibles y modales armónicos.
- **Persistencia**: La preferencia se almacena en SQLite y se mantiene intacta entre sesiones.

### 📅 3. Calendario Interactivo en Toda la App
- **Sin escribir fechas a mano**: Navega visualmente por meses y años con cuadrícula completa y nombres de días en español.
- **Accesos Rápidos en 1 Toque**: Botones automáticos para *Hoy*, *Mañana*, *+7 días*, *+15 días* y *1° del próximo mes*.
- Integrado en transacciones, recurrentes, cuotas y préstamos.

### 🐜 4. Radar de Gastos Hormiga & Suscripciones Compartidas
- **Detector de Fugas de Dinero**: Registra en segundos compras impulsivas, cafés de Starbucks, snacks, propinas y deliverys.
- **Suscripciones Compartidas**: Divide suscripciones familiares como Netflix o Spotify indicando quiénes participan y calculando tu costo real mensual vs. dinero a reembolsar.

### ⏳ 5. Runway y Supervivencia Financiera
- **Burn Rate Diario**: Conoce cuánto dinero estás quemando por día este mes.
- **Días de Supervivencia**: Cálculo exacto de cuántos días te rinde tu saldo antes de llegar a $0.
- **Presupuesto Diario Seguro**: Simula la fecha de tu próximo cheque de pago (*Paycheck*) y obtén el límite seguro de gasto diario para no quedarte sin fondos.

### 💳 6. Rastreador de Cuotas BNPL & Métodos de Pago de Deuda
- **Plataformas Soportadas**: Affirm, Klarna, Afterpay, PayPal Pay in 4, Zip y tarjetas de crédito.
- **Proyección Automática de Fechas**: Selecciona la primera fecha de pago y la frecuencia (*Mensual, Quincenal o Semanal*); la app proyectará y mostrará las fechas de todas las cuotas restantes en el calendario.
- **Estrategias Financieras**:
  - 🎯 **Método Bola de Nieve (Snowball)**: Liquida primero las deudas de menor saldo para ganar victorias psicológicas rápidas.
  - 🔥 **Método Avalancha (Avalanche)**: Prioriza las deudas con mayor tasa de interés (APR %) para ahorrar la mayor cantidad de dinero.
- **Recordatorios Android**: Notificaciones automáticas 1 o 2 días antes de cada vencimiento.

### 🤝 7. Préstamos Vinculados a Cuentas Bancarias
- Control bidireccional: **"Me deben (Presté dinero)"** y **"Le debo (Pedí prestado)"**.
- **Cuentas Asociadas**: Indica de qué cuenta salió el dinero prestado o en cuál se depositó.
- **Abonos Parciales o Totales**: Registra pagos vinculándolos a la cuenta bancaria correspondiente.

### 🔒 8. Privacidad Total, Ahorros Propios & Dinero Separado
- **Cero Mezclas de Fondos**: Tu dinero para gastos diarios (*Saldo Disponible*), tus ahorros propios (*Mis Ahorros*) y el dinero guardado para terceros (*Dinero Ajeno*) se mantienen en tres bolsas completamente separadas.
- **Persistencia de Privacidad**: La app recuerda permanentemente si decidiste ocultar con `••••••` el dinero ajeno y separado, manteniéndolo oculto incluso al cerrar y reabrir la app.
- **Patrimonio Neto Protegido**: El dinero ajeno nunca infla tu saldo propio ni tu patrimonio personal neto real.
- **Priorización de Cuentas**: Al registrar cualquier compra o movimiento, tus cuentas personales siempre aparecen en primer lugar.

### ✏️ 9. Edición Total de Recurrentes y Categorías
- **Edición Completa de Recurrentes**: Modifica título, monto, cuenta, categoría, fecha de vencimiento y frecuencias en cualquier momento.
- **Personalización de Categorías**: Edita nombre, paleta de colores e íconos de cualquier categoría con más de 65 opciones visuales.

### 📥 10. Importador de Google Billetera & Alertas SMS
- Pega textos de notificaciones bancarias o alertas de compra y la app extraerá automáticamente el monto, comercio y fecha.

### ☁️ 11. Respaldo en la Nube con Google Drive
- Exporta e importa copias de seguridad completas en formato `.json` a Google Drive o almacenamiento local sin perder datos.

---

## 🛠️ Tecnologías Utilizadas

| Componente | Tecnología |
| :--- | :--- |
| **Framework Móvil** | [React Native 0.88](https://reactnative.dev) + [Expo SDK 58](https://expo.dev) |
| **Enrutamiento** | [Expo Router v58](https://docs.expo.dev/router/introduction/) (File-based navigation) |
| **Lenguaje** | [TypeScript 6.0](https://www.typescriptlang.org/) |
| **Almacenamiento Local** | [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (Transacciones ACID) |
| **Gráficos Vectoriales** | [React Native SVG](https://github.com/software-mansion/react-native-svg) |
| **Notificaciones** | [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) |
| **CI / CD** | GitHub Actions para compilación automática de APK Release |

---

## 📂 Estructura del Proyecto

```text
finanzas-usa/
├── app/                      # Rutas de Expo Router
│   ├── _layout.tsx           # Layout principal y proveedores de contexto
│   └── (tabs)/               # Pestañas de la aplicación
│       ├── _layout.tsx       # Barra de navegación inferior
│       ├── index.tsx         # Resumen principal, patrimonio y radar hormiga
│       ├── accounts.tsx      # Gestión de bancos, tarjetas y cuentas separadas
│       ├── analytics.tsx     # Runway, presupuestos por categoría y gráficas
│       ├── recurring.tsx     # Cuotas BNPL, préstamos, recurrentes y metas
│       └── settings.tsx      # Modo blanco/negro, categorías y respaldos
├── src/
│   ├── components/           # Componentes reutilizables
│   │   ├── BrandIcon.tsx         # Iconos de marcas bancarias y comercios
│   │   ├── DatePickerModal.tsx   # Calendario interactivo y selector de fechas
│   │   ├── ExpensePieChart.tsx   # Gráfico de dona SVG para gastos
│   │   └── KeyboardSafeModal.tsx # Modales seguros ante teclado en pantalla
│   ├── context/              # Contextos globales
│   │   ├── FinanceContext.tsx    # Estado financiero, cálculos y base de datos
│   │   └── ThemeContext.tsx      # Tema claro/oscuro y paleta de colores
│   ├── db/                   # Capa de base de datos
│   │   └── database.ts           # Esquemas y migraciones SQLite
│   ├── services/             # Servicios auxiliares
│   │   ├── backupService.ts      # Exportación e importación de JSON
│   │   └── notificationService.ts# Recordatorios de cuotas y vencimientos
│   └── types/                # Definiciones de tipos TypeScript
│       └── finance.ts            # Modelos de datos financieros
├── .github/workflows/        # Automatización de GitHub Actions
│   └── build-apk.yml         # Pipeline de compilación y publicación de APK
└── package.json
```

---

## 🚀 Instalación y Desarrollo

### Requisitos Previos
- [Node.js](https://nodejs.org/) (versión 20 o 22 recomendada)
- [Git](https://git-scm.com/)
- Aplicación **Expo Go** en tu dispositivo Android o iOS (o un emulador configurado).

### Pasos para Ejecutar Localmente

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/JeisonCrespo/finanzas-usa.git
   cd finanzas-usa
   ```

2. **Instalar dependencias**:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Iniciar el servidor de desarrollo**:
   ```bash
   npx expo start --go -c
   ```

4. **Probar en tu teléfono**:
   - Abre la app **Expo Go** en Android.
   - Escanea el código QR que aparece en la terminal o ingresa la URL de Metro Bundler (`exp://<tu-ip-local>:8081`).

---

## 📦 Compilación del APK para Android

El repositorio cuenta con un flujo automatizado en **GitHub Actions** ([`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml)) que genera el archivo `.apk` instalable de forma automática cada vez que se publica una etiqueta de versión (`v*`).

Para compilar localmente con Expo Prebuild:
```bash
# 1. Generar la carpeta nativa Android
npx expo prebuild --platform android --clean

# 2. Compilar el APK en modo Release
cd android
./gradlew assembleRelease --no-daemon
```
El archivo generado se ubicará en:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Puedes usarlo, modificarlo y distribuirlo libremente.

<div align="center">
  <sub>Desarrollado con dedicación para una gestión financiera inteligente, rápida y privada.</sub>
</div>

