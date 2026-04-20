// types/database.ts
// 对应 supabase/migrations/001_core_identity_store.sql 和 002_circle_game.sql
// 11 张表 + 3 个枚举，完全 snake_case

export type RoomTypeEnum = 'standard' | 'friends' | 'vip'
export type ReservationStatusEnum = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type GameStatusEnum = 'created' | 'in_progress' | 'finished' | 'cancelled'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string
          nickname: string | null
          avatar_url: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone: string
          nickname?: string | null
          avatar_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string
          nickname?: string | null
          avatar_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      member_accounts: {
        Row: {
          id: string
          user_id: string
          member_level: string
          wallet_balance: number
          points_balance: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          member_level?: string
          wallet_balance?: number
          points_balance?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          member_level?: string
          wallet_balance?: number
          points_balance?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          name: string
          city: string | null
          address: string | null
          phone: string | null
          rent_monthly: number | null
          status: string
          opened_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          city?: string | null
          address?: string | null
          phone?: string | null
          rent_monthly?: number | null
          status?: string
          opened_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          city?: string | null
          address?: string | null
          phone?: string | null
          rent_monthly?: number | null
          status?: string
          opened_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          store_id: string
          room_no: string
          room_type: RoomTypeEnum
          capacity: number
          status: string
          current_clean_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          room_no: string
          room_type?: RoomTypeEnum
          capacity?: number
          status?: string
          current_clean_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          room_no?: string
          room_type?: RoomTypeEnum
          capacity?: number
          status?: string
          current_clean_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      circles: {
        Row: {
          id: string
          store_id: string
          owner_user_id: string
          name: string
          description: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          owner_user_id: string
          name: string
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          owner_user_id?: string
          name?: string
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      circle_members: {
        Row: {
          id: string
          circle_id: string
          user_id: string
          role: string
          joined_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          circle_id: string
          user_id: string
          role?: string
          joined_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          circle_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          is_active?: boolean
        }
      }
      reservations: {
        Row: {
          id: string
          store_id: string
          room_id: string
          circle_id: string | null
          created_by: string
          reservation_date: string
          start_time: string
          end_time: string
          status: ReservationStatusEnum
          source: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          room_id: string
          circle_id?: string | null
          created_by: string
          reservation_date: string
          start_time: string
          end_time: string
          status?: ReservationStatusEnum
          source?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          room_id?: string
          circle_id?: string | null
          created_by?: string
          reservation_date?: string
          start_time?: string
          end_time?: string
          status?: ReservationStatusEnum
          source?: string
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          store_id: string
          room_id: string
          circle_id: string | null
          reservation_id: string | null
          created_by: string
          room_type: RoomTypeEnum
          status: GameStatusEnum
          started_at: string | null
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          room_id: string
          circle_id?: string | null
          reservation_id?: string | null
          created_by: string
          room_type?: RoomTypeEnum
          status?: GameStatusEnum
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          room_id?: string
          circle_id?: string | null
          reservation_id?: string | null
          created_by?: string
          room_type?: RoomTypeEnum
          status?: GameStatusEnum
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      game_participants: {
        Row: {
          id: string
          game_id: string
          user_id: string
          seat_no: number
          joined_at: string
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          seat_no: number
          joined_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          user_id?: string
          seat_no?: number
          joined_at?: string
        }
      }
      game_results: {
        Row: {
          id: string
          game_id: string
          user_id: string
          rank: number
          score: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          rank: number
          score?: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          user_id?: string
          rank?: number
          score?: number
          created_at?: string
        }
      }
      result_cards: {
        Row: {
          id: string
          game_id: string
          card_image_url: string | null
          generated_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          card_image_url?: string | null
          generated_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          card_image_url?: string | null
          generated_by?: string | null
          created_at?: string
        }
      }
    }
    Enums: {
      room_type_enum: RoomTypeEnum
      reservation_status_enum: ReservationStatusEnum
      game_status_enum: GameStatusEnum
    }
  }
}
