/**
 * Database Types - Auto-generated dari Supabase schema
 * Untuk regenerasi: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
 * File ini merepresentasikan tabel-tabel di Supabase
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Musim = 'kemarau' | 'hujan'
export type StatusHarga = 'normal' | 'merah' | 'kuning'
export type TipePelanggan = 'sub_supplier' | 'dapur_mbg' | 'retail'

// ============================================================
// TABLE TYPES
// ============================================================

export interface Database {
  public: {
    Tables: {
      pelanggan: {
        Row: {
          id: string
          kode: string | null
          nama: string
          tipe: TipePelanggan
          kontak_nama: string | null
          kontak_telepon: string | null
          alamat: string | null
          kota: string | null
          catatan: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          kode?: string | null
          nama: string
          tipe: TipePelanggan
          kontak_nama?: string | null
          kontak_telepon?: string | null
          alamat?: string | null
          kota?: string | null
          catatan?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kode?: string | null
          nama?: string
          tipe?: TipePelanggan
          kontak_nama?: string | null
          kontak_telepon?: string | null
          alamat?: string | null
          kota?: string | null
          catatan?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      penjualan: {
        Row: {
          id: string
          no_transaksi: string | null
          tanggal: string
          buah_id: string
          pelanggan_id: string
          jumlah_kg: number
          harga_jual_per_kg: number
          total_nilai: number
          hpp_snapshot: number | null
          spare_pct: number | null
          margin_per_kg: number | null
          catatan: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          no_transaksi?: string | null
          tanggal?: string
          buah_id: string
          pelanggan_id: string
          jumlah_kg: number
          harga_jual_per_kg: number
          hpp_snapshot?: number | null
          spare_pct?: number | null
          catatan?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          tanggal?: string
          buah_id?: string
          pelanggan_id?: string
          jumlah_kg?: number
          harga_jual_per_kg?: number
          hpp_snapshot?: number | null
          spare_pct?: number | null
          catatan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      buah: {
        Row: {
          id: string
          kode: string | null
          nama: string
          kategori: string | null
          satuan: string
          berat_peti_kemarau: number
          pct_afkir_kemarau: number
          berat_peti_hujan: number
          pct_afkir_hujan: number
          berat_per_pcs_gram: number | null
          deskripsi: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          kode?: string | null
          nama: string
          kategori?: string | null
          satuan?: string
          berat_peti_kemarau: number
          pct_afkir_kemarau: number
          berat_peti_hujan: number
          pct_afkir_hujan: number
          berat_per_pcs_gram?: number | null
          deskripsi?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kode?: string | null
          nama?: string
          kategori?: string | null
          satuan?: string
          berat_peti_kemarau?: number
          pct_afkir_kemarau?: number
          berat_peti_hujan?: number
          pct_afkir_hujan?: number
          berat_per_pcs_gram?: number | null
          deskripsi?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      pemasok: {
        Row: {
          id: string
          kode: string | null
          nama: string
          kategori: 'Tangan 1' | 'Tangan 2' | 'Tangan 3' | null
          kontak_nama: string | null
          kontak_telepon: string | null
          alamat: string | null
          kota: string | null
          catatan: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          kode?: string | null
          nama: string
          kategori?: 'Tangan 1' | 'Tangan 2' | 'Tangan 3' | null
          kontak_nama?: string | null
          kontak_telepon?: string | null
          alamat?: string | null
          kota?: string | null
          catatan?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kode?: string | null
          nama?: string
          kategori?: 'Tangan 1' | 'Tangan 2' | 'Tangan 3' | null
          kontak_nama?: string | null
          kontak_telepon?: string | null
          alamat?: string | null
          kota?: string | null
          catatan?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      pembelian: {
        Row: {
          id: string
          no_transaksi: string | null
          tanggal: string
          buah_id: string
          pemasok_id: string
          musim: Musim
          jumlah_peti: number
          harga_beli_per_peti: number
          berat_bruto_total: number
          biaya_transport_per_peti: number
          total_biaya_regu_sortir: number
          nilai_recovery_afkir: number
          snap_berat_peti_used: number | null
          snap_pct_afkir_used: number | null
          landed_cost: number | null
          berat_afkir: number | null
          net_yield: number | null
          biaya_kuli_sortir_per_kg: number | null
          hpp_per_kg: number | null
          catatan: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          no_transaksi?: string | null
          tanggal?: string
          buah_id: string
          pemasok_id: string
          musim: Musim
          jumlah_peti?: number
          harga_beli_per_peti: number
          berat_bruto_total: number
          biaya_transport_per_peti?: number
          total_biaya_regu_sortir?: number
          nilai_recovery_afkir?: number
          snap_berat_peti_used?: number | null
          snap_pct_afkir_used?: number | null
          landed_cost?: number | null
          berat_afkir?: number | null
          net_yield?: number | null
          biaya_kuli_sortir_per_kg?: number | null
          hpp_per_kg?: number | null
          catatan?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          tanggal?: string
          buah_id?: string
          pemasok_id?: string
          musim?: Musim
          jumlah_peti?: number
          harga_beli_per_peti?: number
          berat_bruto_total?: number
          biaya_transport_per_peti?: number
          total_biaya_regu_sortir?: number
          nilai_recovery_afkir?: number
          snap_berat_peti_used?: number | null
          snap_pct_afkir_used?: number | null
          landed_cost?: number | null
          berat_afkir?: number | null
          net_yield?: number | null
          biaya_kuli_sortir_per_kg?: number | null
          hpp_per_kg?: number | null
          catatan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pricing: {
        Row: {
          id: string
          buah_id: string
          harga_mentok_pasar: number | null
          harga_jual_dapur: number | null
          harga_jual_supplier: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          buah_id: string
          harga_mentok_pasar?: number | null
          harga_jual_dapur?: number | null
          harga_jual_supplier?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          buah_id?: string
          harga_mentok_pasar?: number | null
          harga_jual_dapur?: number | null
          harga_jual_supplier?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_latest_hpp: {
        Row: {
          buah_id: string
          nama_buah: string
          kode_buah: string | null
          hpp_per_kg: number
          net_yield: number
          musim: Musim
          tanggal_pembelian: string
          pembelian_id: string
        }
        Relationships: []
      }
      v_pricing_matrix: {
        Row: {
          buah_id: string
          nama_buah: string
          kode_buah: string | null
          is_active: boolean
          hpp_asli_per_kg: number | null
          tanggal_pembelian: string | null
          musim_hpp: Musim | null
          harga_mentok_pasar: number | null
          harga_jual_dapur: number | null
          harga_jual_supplier: number | null
          margin_dapur: number | null
          margin_supplier: number | null
          status_harga: StatusHarga
          pricing_updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================
// CONVENIENCE TYPES (digunakan di components)
// ============================================================

export type BuahRow     = Database['public']['Tables']['buah']['Row']
export type BuahInsert  = Database['public']['Tables']['buah']['Insert']
export type BuahUpdate  = Database['public']['Tables']['buah']['Update']

export type PemasokRow    = Database['public']['Tables']['pemasok']['Row']
export type PemasokInsert = Database['public']['Tables']['pemasok']['Insert']
export type PemasokUpdate = Database['public']['Tables']['pemasok']['Update']

export type PembelianRow    = Database['public']['Tables']['pembelian']['Row']
export type PembelianInsert = Database['public']['Tables']['pembelian']['Insert']

export type PricingRow    = Database['public']['Tables']['pricing']['Row']
export type PricingUpdate = Database['public']['Tables']['pricing']['Update']

export type PelangganRow    = Database['public']['Tables']['pelanggan']['Row']
export type PelangganInsert = Database['public']['Tables']['pelanggan']['Insert']
export type PelangganUpdate = Database['public']['Tables']['pelanggan']['Update']

export type PenjualanRow    = Database['public']['Tables']['penjualan']['Row']
export type PenjualanInsert = Database['public']['Tables']['penjualan']['Insert']

export type LatestHppRow     = Database['public']['Views']['v_latest_hpp']['Row']
export type PricingMatrixRow = Database['public']['Views']['v_pricing_matrix']['Row']
