package com.rebali.community;

import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Bundle;

import androidx.core.app.NotificationChannelCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String CHANNEL_MESSAGES  = "rebali_messages";
    private static final String CHANNEL_ALERTS    = "rebali_alerts";
    private static final String CHANNEL_REMINDERS = "rebali_reminders";
    private static final String CHANNEL_DEFAULT   = "rebali_default";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        NotificationManagerCompat mgr = NotificationManagerCompat.from(this);

        AudioAttributes notifAudioAttrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        // 1. Messages channel — gentle chime
        Uri messageSound = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/notif_message"
        );
        NotificationChannelCompat messagesChannel =
            new NotificationChannelCompat.Builder(CHANNEL_MESSAGES, NotificationManagerCompat.IMPORTANCE_HIGH)
                .setName("Messages")
                .setDescription("New message notifications")
                .setSound(messageSound, notifAudioAttrs)
                .setVibrationEnabled(true)
                .setVibrationPattern(new long[]{0, 200, 100, 200})
                .build();

        // 2. Alerts channel — deals, favorites, search alerts
        Uri alertSound = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/notif_alert"
        );
        NotificationChannelCompat alertsChannel =
            new NotificationChannelCompat.Builder(CHANNEL_ALERTS, NotificationManagerCompat.IMPORTANCE_HIGH)
                .setName("Alerts")
                .setDescription("Deals, favorites, and search alert notifications")
                .setSound(alertSound, notifAudioAttrs)
                .setVibrationEnabled(true)
                .setVibrationPattern(new long[]{0, 150, 80, 150})
                .build();

        // 3. Reminders channel — re-engagement after 48h absence
        Uri reminderSound = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/notif_reminder"
        );
        NotificationChannelCompat remindersChannel =
            new NotificationChannelCompat.Builder(CHANNEL_REMINDERS, NotificationManagerCompat.IMPORTANCE_DEFAULT)
                .setName("Reminders")
                .setDescription("Re-engagement reminders")
                .setSound(reminderSound, notifAudioAttrs)
                .setVibrationEnabled(true)
                .setVibrationPattern(new long[]{0, 300, 200, 300})
                .build();

        // 4. Default channel
        NotificationChannelCompat defaultChannel =
            new NotificationChannelCompat.Builder(CHANNEL_DEFAULT, NotificationManagerCompat.IMPORTANCE_DEFAULT)
                .setName("General")
                .setDescription("General notifications")
                .build();

        mgr.createNotificationChannel(messagesChannel);
        mgr.createNotificationChannel(alertsChannel);
        mgr.createNotificationChannel(remindersChannel);
        mgr.createNotificationChannel(defaultChannel);
    }
}
