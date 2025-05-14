declare module 'mercadopago' {
  interface MercadoPagoConfig {
    configure: (config: { access_token: string }) => void;
    preferences: {
      create: (preference: any) => Promise<MercadoPagoResponse<any>>;
    };
    payment: {
      findById: (id: string) => Promise<MercadoPagoResponse<any>>;
    };
  }

  const mercadopago: MercadoPagoConfig;
  export default mercadopago;
}
